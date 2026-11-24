import { test, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import ExcelJS from 'exceljs';
import { creation, restoreFixture } from './fixtures.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 't097-tests-'));
process.env.STRATEGY_DB = path.join(dir, 'isolated.sqlite');
const { app } = await import('../server/index.mjs');
const { db } = await import('../server/db.mjs');
const accounts = JSON.parse(fs.readFileSync(process.env.STRATEGY_DB + '.accounts.json', 'utf8'));
const sessions = {};
let server, base;

async function http(path, actor, method = 'GET', body) {
  const res = await fetch(base + '/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(sessions[actor] ? { cookie: sessions[actor] } : {}),
    },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body || {}) }),
  });
  return {
    status: res.status,
    cookie: res.headers.get('set-cookie'),
    body: res.headers.get('content-type')?.includes('json')
      ? await res.json()
      : Buffer.from(await res.arrayBuffer()),
  };
}
async function expectHttp(path, actor, method, body, status = 200) {
  const result = await http(path, actor, method, body);
  assert.equal(result.status, status, JSON.stringify(result.body));
  return result.body;
}
const post = (path, actor, body, status) => expectHttp(path, actor, 'POST', body, status);
const patch = (path, actor, body, status) => expectHttp(path, actor, 'PATCH', body, status);
const dashboard = (query = '') => expectHttp('/dashboard' + query, 'management', 'GET');
const scope = (role) => expectHttp('/bootstrap', role, 'GET');
const row = (table, id) => db.prepare('SELECT * FROM ' + table + ' WHERE id=?').get(id);
const total = (table) => db.prepare('SELECT count(*) AS n FROM ' + table).get().n;
const current = (p = 75, status = 'In Progress') => ({ progress: p, status });
async function progress(body, status = 200, id = 1, actor = 'owner') {
  const before = row('initiatives', id);
  const count = total('progress_updates');
  await post('/initiatives/' + id + '/progress', actor, body, status);
  if (status >= 400) {
    assert.deepEqual(row('initiatives', id), before);
    assert.equal(total('progress_updates'), count);
  }
}
before(async () => {
  mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-19T06:30:00Z') });
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = 'http://127.0.0.1:' + server.address().port;
  for (const a of accounts) {
    const result = await http('/login', null, 'POST', a);
    assert.equal(result.status, 200);
    sessions[a.username] = result.cookie.split(';')[0];
  }
});
beforeEach(() => restoreFixture(db));
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  mock.timers.reset();
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('TC-001 valid credentials open planning workspace', async () => {
  const login = await http(
    '/login',
    null,
    'POST',
    accounts.find((a) => a.username === 'planner'),
  );
  assert.equal(login.status, 200);
  assert.match(login.cookie, /HttpOnly/);
  sessions.valid = login.cookie.split(';')[0];
  assert.equal((await scope('valid')).actor.role, 'planner');
});
test('TC-002 invalid credentials disclose no account details', async () => {
  const a = await http('/login', null, 'POST', { username: 'planner', password: 'invalid' });
  const b = await http('/login', null, 'POST', { username: 'unknown', password: 'invalid' });
  assert.equal(a.status, 401);
  assert.equal(a.cookie, null);
  assert.deepEqual(a.body, b.body);
});
test('TC-003 create a linked Planned initiative with zero progress', async () => {
  const { id } = await post('/initiatives', 'planner', creation, 201);
  const i = (await scope('planner')).initiatives.find((i) => i.id === id);
  assert.deepEqual(
    [i.title, i.goalId, i.ownerId, i.progress, i.status],
    [creation.title, 1, 2, 0, 'Planned'],
  );
});
test('TC-004 edit title and description, retaining links and progress', async () => {
  const b = {
    ...(await scope('planner')).initiatives.find((i) => i.id === 1),
    title: 'Advanced AI Research Lab Setup',
    description: 'Enhance laboratory research infrastructure',
  };
  await patch('/initiatives/1', 'planner', b);
  const r = row('initiatives', 1);
  assert.deepEqual(
    [r.title, r.description, r.goal_id, r.owner_id, r.progress, total('initiatives')],
    [b.title, b.description, 1, 2, 60, 4],
  );
});
for (const [id, name, changes, status] of [
  ['005', 'missing title', { title: '' }, 400],
  ['006', 'missing goal', { goalId: 99 }, 404],
  ['007', 'inactive goal', { goalId: 3 }, 400],
  ['008', 'unknown owner', { ownerId: 99 }, 400],
  ['009', 'deadline before start', { startDate: '2026-11-25', dueDate: '2026-11-20' }, 400],
])
  test('TC-' + id + ' rejects ' + name, async () => {
    if (id === '007')
      db.exec(
        "INSERT INTO strategic_goals(id,title,target_date,status) VALUES(3,'Previous Research Improvement Plan','2026-01-01','Inactive')",
      );
    await post('/initiatives', 'planner', { ...creation, ...changes }, status);
    assert.equal(total('initiatives'), 4);
  });
test('TC-010 activation requires an assigned owner', async () => {
  const { id } = await post('/initiatives', 'planner', { ...creation, ownerId: null }, 201);
  await post('/initiatives/' + id + '/submit', 'planner', {});
  await post('/initiatives/' + id + '/decision', 'management', { action: 'approve' }, 400);
  assert.equal(row('initiatives', id).status, 'Planned');
});
test('TC-011 owner has no initiative creation permission', async () => {
  await post('/initiatives', 'owner', creation, 403);
  assert.equal(total('initiatives'), 4);
});
test('TC-012 creation persistence failure preserves original records', async () => {
  db.exec(
    "CREATE TRIGGER simulate_save_failure BEFORE INSERT ON initiatives BEGIN SELECT RAISE(ABORT,'test write failure'); END",
  );
  await post('/initiatives', 'planner', creation, 500);
  assert.equal(total('initiatives'), 4);
  assert.equal(total('audit'), 0);
});
test('TC-013 owner progress persists and appears on management dashboard', async () => {
  await progress(current());
  assert.equal((await dashboard()).initiatives.find((i) => i.id === 1).progress, 75);
  assert.equal(total('progress_updates'), 1);
});
for (const [id, p, initial] of [
  ['014', -1, 60],
  ['015', 0, 0],
  ['016', 1, 0],
  ['017', 99, 98],
  ['018', 100, 99],
  ['019', 101, 99],
]) {
  test('TC-' + id + ' initiative boundary ' + p, async () => {
    const state = p === 0 ? 'Planned' : 'In Progress';
    db.prepare('UPDATE initiatives SET progress=?,status=? WHERE id=1').run(initial, state);
    if (p === 100)
      db.exec("UPDATE milestones SET progress=100,status='Completed' WHERE initiative_id=1");
    const valid = p >= 0 && p <= 100;
    await progress(current(p, p === 100 ? 'Completed' : state), valid ? 200 : 400);
    assert.equal(row('initiatives', 1).progress, valid ? p : initial);
  });
}
test('TC-020 another owner cannot change the initiative', () => progress(current(), 403, 2));
test('TC-021 session required to submit progress', () => progress(current(), 401, 1, null));
test('TC-022 invalid initiative status', () => progress(current(75, 'Invalid_Test_Status'), 400));
test('TC-023 progress and its associated milestone saved together', async () => {
  await progress({ ...current(), milestone: { id: 2, progress: 80, status: 'In Progress' } });
  assert.equal(row('milestones', 2).progress, 80);
  assert.equal(row('initiatives', 1).progress, 75);
});
for (const [id, m, p] of [
  ['024', 3, 80],
  ['025', 2, 101],
])
  test('TC-' + id + ' invalid child update leaves both records intact', async () => {
    const prior = row('milestones', m);
    await progress({ ...current(), milestone: { id: m, progress: p, status: 'In Progress' } }, 400);
    assert.deepEqual(row('milestones', m), prior);
  });
test('TC-026 incomplete required milestone prevents closure', () =>
  progress(current(100, 'Completed'), 400));
test('TC-027 late update persists and produces a delay notification', async () => {
  await progress(current(80), 200, 3);
  const data = await scope('owner');
  const late = data.initiatives.find((i) => i.id === 3);
  assert.equal(late.progress, 80);
  assert.equal(late.displayStatus, 'Delayed');
  assert.ok(
    data.notifications.some((n) => n.message.includes(late.title) && n.message.includes('overdue')),
  );
});
test('TC-028 consolidated goal, initiative, milestone and KPI overview', async () => {
  const d = await dashboard();
  assert.deepEqual(
    [d.goals.length, d.initiatives.length, d.milestones.length, d.kpis.length],
    [2, 4, 4, 3],
  );
  assert.deepEqual(
    d.goals.map((g) => g.progress),
    [63, 70],
  );
  assert.deepEqual(
    d.initiatives.map((i) => i.progress).sort((a, b) => a - b),
    [30, 60, 70, 100],
  );
});
test('TC-029 current KPI compared with target', async () => {
  const k = (await dashboard()).kpis[0];
  assert.deepEqual(
    [k.currentValue, k.targetValue, k.unit, k.progressPct, k.status],
    [6, 10, 'Papers', 60, 'Below target'],
  );
});
test('TC-030 missing current KPI value stays unavailable', async () => {
  db.exec('UPDATE kpis SET current_value=NULL WHERE id=1');
  const k = (await dashboard()).kpis[0];
  assert.deepEqual([k.currentValue, k.progressPct, k.status], [null, null, 'Awaiting data']);
});
for (const [id, day, delayed] of [
  ['031', '18', true],
  ['032', '19', false],
  ['033', '20', false],
])
  test('TC-' + id + ' initiative and milestone deadline ' + day + ' November', async () => {
    db.prepare('UPDATE initiatives SET due_date=? WHERE id=3').run('2026-11-' + day);
    db.prepare('UPDATE milestones SET due_date=? WHERE id=3').run('2026-11-' + day);
    const d = await dashboard();
    assert.equal(d.serverDate, '2026-11-19');
    assert.equal(d.initiatives.find((i) => i.id === 3).isDelayed, delayed);
    assert.equal(d.milestones.find((i) => i.id === 3).isDelayed, delayed);
  });
test('TC-034 completed work is not overdue', async () => {
  const d = await dashboard();
  for (const item of [d.initiatives, d.milestones]) {
    const r = item.find((i) => i.id === 4);
    assert.equal(r.isDelayed, false);
    assert.equal(r.status, 'Completed');
  }
});
test('TC-035 empty plan returns empty collections', async () => {
  db.exec(
    'DELETE FROM kpis; DELETE FROM milestones; DELETE FROM initiatives; DELETE FROM strategic_goals',
  );
  const d = await dashboard();
  for (const key of ['goals', 'initiatives', 'milestones', 'kpis']) assert.deepEqual(d[key], []);
});
test('TC-036 unknown dashboard filter rejected', () =>
  expectHttp('/dashboard?status=Invalid_Test_Status', 'management', 'GET', null, 400));
test('TC-037 owner denied institution-wide view', () =>
  expectHttp('/dashboard', 'owner', 'GET', null, 403));
test('TC-038 management view requires login', () => expectHttp('/dashboard', null, 'GET', null, 401));
test('TC-039 detail records follow goal and initiative relationships', async () => {
  const d = await dashboard('?goalId=1');
  assert.deepEqual(d.initiatives.map((i) => i.id).sort(), [1, 2, 4]);
  assert.deepEqual(
    d.milestones.filter((m) => m.initiativeId === 1).map((m) => m.id),
    [1, 2],
  );
  assert.deepEqual(
    d.kpis.filter((k) => k.initiativeId === 1).map((k) => k.id),
    [1],
  );
});
test('TC-040 isolated KPI retrieval failure preserves available sections', async () => {
  db.exec('ALTER TABLE kpis RENAME TO offline_kpis');
  try {
    const d = await dashboard();
    assert.deepEqual(d.unavailable, ['KPIs']);
    assert.deepEqual(d.kpis, []);
    assert.equal(d.goals.length, 2);
    assert.equal(d.initiatives.length, 4);
    assert.equal(d.milestones.length, 4);
  } finally {
    db.exec('ALTER TABLE offline_kpis RENAME TO kpis');
  }
});

test('failed closure rolls back a simultaneous child change', async () => {
  await progress(
    { ...current(100, 'Completed'), milestone: { id: 2, progress: 80, status: 'In Progress' } },
    400,
  );
  assert.equal(row('milestones', 2).progress, 40);
});
test('simultaneous owner saves retain each history entry and a consistent final state', async () => {
  await Promise.all([
    post('/initiatives/1/progress', 'owner', current(71)),
    post('/initiatives/1/progress', 'owner', current(72)),
  ]);
  const log = db
    .prepare('SELECT previous_progress,new_progress FROM progress_updates ORDER BY id')
    .all();
  assert.equal(log.length, 2);
  assert.equal(log[0].previous_progress, 60);
  assert.equal(log[1].previous_progress, log[0].new_progress);
  assert.equal(row('initiatives', 1).progress, log[1].new_progress);
});
test('scheduled reminders reach the assigned owner and department head once per deadline event', async () => {
  const { deliverReminders } = await import('../server/repositories.mjs');
  deliverReminders();
  const count = total('notifications');
  deliverReminders();
  assert.equal(total('notifications'), count);
  for (const role of ['owner', 'head']) {
    const alerts = (await scope(role)).notifications;
    assert.ok(alerts.some((n) => n.message.includes('Install and Configure is due soon')));
    assert.ok(alerts.some((n) => n.message.includes('Complete Laboratory Upgrade is overdue')));
  }
  assert.ok(
    !(await scope('owner2')).notifications.some((n) =>
      n.message.includes('Complete Laboratory Upgrade'),
    ),
  );
});

test('planner, management, owner and KPI officer complete a new plan workflow', async () => {
  const kpiView = await scope('kpi');
  assert.equal(kpiView.milestones, undefined);
  assert.deepEqual(Object.keys(kpiView.initiatives[0]).sort(), ['id', 'title']);
  const { id: g } = await post(
    '/goals',
    'planner',
    { title: 'Test goal', startDate: '2026-11-01', dueDate: '2027-06-30', status: 'Active' },
    201,
  );
  await post('/goals/' + g + '/submit', 'planner', {});
  await post('/goals/' + g + '/decision', 'management', { action: 'approve' });
  const { id: i } = await post('/initiatives', 'planner', { ...creation, goalId: g }, 201);
  await post('/initiatives/' + i + '/submit', 'planner', {});
  await post('/initiatives/' + i + '/decision', 'management', { action: 'reject' });
  await post('/initiatives/' + i + '/submit', 'planner', {});
  await post('/initiatives/' + i + '/decision', 'management', { action: 'approve' });
  const { id: m } = await post(
    '/milestones',
    'planner',
    {
      title: 'Delivery',
      initiativeId: i,
      dueDate: '2026-12-20',
      required: true,
      status: 'Not Started',
      progress: 0,
    },
    201,
  );
  const { id: k } = await post(
    '/kpis',
    'kpi',
    { name: 'Count', initiativeId: i, targetValue: 4, unit: 'papers', threshold: 2 },
    201,
  );
  await patch('/kpis/' + k, 'owner', { currentValue: 5 });
  assert.equal((await scope('kpi')).kpis.find((item) => item.id === k).status, 'Target met');
  await post(
    '/risks',
    'owner',
    { title: 'Delay', mitigation: 'Review timing', initiativeId: i, status: 'Open' },
    201,
  );
  await progress(
    { ...current(100, 'Completed'), milestone: { id: m, progress: 100, status: 'Completed' } },
    200,
    i,
  );
  assert.equal(row('initiatives', i).status, 'Completed');
  assert.ok((await scope('admin')).audit.length >= 9);
});
test('department scope, report permissions, snapshot and Excel export', async () => {
  const d = await scope('head');
  assert.ok(!d.initiatives.some((i) => i.id === 2));
  assert.deepEqual(
    d.kpis.map((k) => k.id),
    [1, 3],
  );
  const { id } = await post('/reports', 'head', { kind: 'Strategic plan' }, 201);
  await expectHttp('/reports/' + id, 'management', 'GET', null, 404);
  db.exec('UPDATE kpis SET current_value=900 WHERE id=1');
  const report = await expectHttp('/reports/' + id, 'head', 'GET');
  assert.equal(report.sections.at(-1).rows[0][2], 6);
  const download = await http('/reports/' + id + '/excel', 'head');
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(download.body);
  assert.equal(book.getWorksheet('KPIs').getCell('C2').value, 6);
});
test('admin creates and changes an account, records audit, revokes prior sessions', async () => {
  const b = {
    fullName: 'Review User',
    username: 'reviewer',
    password: 'test-only-password',
    role: 'head',
    department: 'Research & Innovation',
    active: true,
  };
  const { id } = await post('/users', 'admin', b, 201);
  const login = await http('/login', null, 'POST', b);
  sessions.review = login.cookie.split(';')[0];
  assert.equal((await scope('review')).actor.role, 'head');
  await patch('/users/' + id, 'admin', { ...b, role: 'management', password: '' });
  await expectHttp('/bootstrap', 'review', 'GET', null, 401);
  await patch('/settings', 'admin', { reminderDays: 3 });
  assert.equal((await scope('admin')).settings.reminderDays, 3);
  const fresh = await http('/login', null, 'POST', b);
  sessions.review = fresh.cookie.split(';')[0];
  await post('/logout', 'review', {});
  await expectHttp('/bootstrap', 'review', 'GET', null, 401);
});
