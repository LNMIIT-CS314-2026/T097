import { db } from './db.mjs';

export const all = (sql, ...params) => db.prepare(sql).all(...params);
export const one = (sql, ...params) => db.prepare(sql).get(...params);
export const run = (sql, ...params) => db.prepare(sql).run(...params);
export const now = () => new Date().toISOString();
const campusDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
export const today = () => campusDate.format(new Date());

export function audit(actor, event) {
  run('INSERT INTO audit(actor_id,event,created_at) VALUES(?,?,?)', actor.id, event, now());
}

export function initiativesFor(actor) {
  let condition = '';
  const args = [];
  if (actor.role === 'owner') {
    condition = 'WHERE i.owner_id=?';
    args.push(actor.id);
  }
  if (actor.role === 'head') {
    condition = 'WHERE u.department=?';
    args.push(actor.department);
  }
  const date = today();
  return all(
    `SELECT i.id,i.title,i.description,i.goal_id AS goalId,g.title AS goalTitle,i.owner_id AS ownerId,
    COALESCE(u.full_name,'Unassigned') AS ownerName, i.start_date AS startDate,i.due_date AS dueDate,i.status,
    i.progress,i.review FROM initiatives i JOIN strategic_goals g ON g.id=i.goal_id
    LEFT JOIN users u ON u.id=i.owner_id ${condition} ORDER BY i.due_date,i.id`,
    ...args,
  ).map((item) => {
    const isDelayed = item.dueDate < date && !['Completed', 'Cancelled'].includes(item.status);
    return { ...item, isDelayed, displayStatus: isDelayed ? 'Delayed' : item.status };
  });
}

export function milestonesFor(ids) {
  return all(
    `SELECT id,initiative_id AS initiativeId,title,description,due_date AS dueDate,status,progress,required
    FROM milestones WHERE initiative_id IN (SELECT value FROM json_each(?)) ORDER BY due_date,id`,
    JSON.stringify(ids),
  ).map((m) => ({
    ...m,
    required: Boolean(m.required),
    isDelayed: m.dueDate < today() && !['Completed', 'Cancelled'].includes(m.status),
  }));
}

export function kpisFor(ids, includeUnlinked) {
  return all(
    `SELECT k.id,k.name,k.description,k.initiative_id AS initiativeId,i.title AS initiativeTitle,
    COALESCE(i.goal_id,k.goal_id) AS goalId,k.current_value AS currentValue,k.target_value AS targetValue,k.unit,k.threshold
    FROM kpis k LEFT JOIN initiatives i ON i.id=k.initiative_id
    WHERE k.initiative_id IN (SELECT value FROM json_each(?)) OR (? AND k.initiative_id IS NULL) ORDER BY k.id`,
    JSON.stringify(ids),
    Number(includeUnlinked),
  ).map((k) => {
    const ratio =
      k.currentValue === null || !(k.targetValue > 0) ? null : k.currentValue / k.targetValue;
    let status = 'Awaiting data';
    if (ratio !== null) {
      status = ratio >= 1 ? 'Target met' : 'Below target';
      if (k.threshold !== null && k.currentValue < k.threshold) status = 'Below threshold';
    }
    return { ...k, progressPct: ratio === null ? null : Math.min(100, Math.round(ratio * 100)), status };
  });
}

export function notify(userId, message, key = null) {
  if (userId)
    run(
      'INSERT OR IGNORE INTO notifications(user_id,message,created_at,event_key) VALUES(?,?,?,?)',
      userId,
      message,
      now(),
      key,
    );
}

export function notifyTeam(ownerId, message) {
  if (!ownerId) return;
  notify(ownerId, message);
  for (const head of all(
    "SELECT h.id FROM users h JOIN users u ON u.department=h.department WHERE u.id=? AND h.role='head' AND h.active=1",
    ownerId,
  )) {
    notify(head.id, message);
  }
}

export function reminders(actor, initiatives, milestones) {
  if (!['owner', 'head'].includes(actor.role)) return;
  const date = today();
  const days = one('SELECT reminder_days FROM settings').reminder_days;
  const limit = new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10);
  for (const [kind, list] of [
    ['Initiative', initiatives],
    ['Milestone', milestones],
  ]) {
    for (const item of list) {
      if (['Completed', 'Cancelled'].includes(item.status) || item.dueDate > limit) continue;
      const state = item.dueDate < date ? 'overdue' : 'due soon';
      notify(
        actor.id,
        kind + ' ' + item.title + ' is ' + state + ' (' + item.dueDate + ').',
        [kind, item.id, item.dueDate, state].join('/'),
      );
    }
  }
}

export function deliverReminders() {
  try {
    for (const recipient of all(
      "SELECT id,role,department FROM users WHERE active=1 AND role IN ('owner','head')",
    )) {
      const initiatives = initiativesFor(recipient);
      reminders(recipient, initiatives, milestonesFor(initiatives.map((i) => i.id)));
    }
  } catch (error) {
    console.error('Deadline check could not finish:', error.message);
  }
}
