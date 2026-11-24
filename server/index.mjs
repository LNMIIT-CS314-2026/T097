import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dbPath, transaction } from './db.mjs';
import { one, run, audit, deliverReminders } from './repositories.mjs';
import { hashPassword, matchesPassword, randomToken, tokenDigest } from './security.mjs';
import { identifier, requireValue, InputError } from './validation.mjs';
import { workspace } from './services/workspace.mjs';
import {
  saveGoal,
  saveInitiative,
  updateProgress,
  saveMilestone,
  saveKpi,
  saveRisk,
  review,
} from './services/strategicPlanService.mjs';
import { saveAccount, saveDepartment, saveSettings } from './services/accounts.mjs';
import { generateReport, getReport, workbook } from './services/reports.mjs';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '128kb' }));
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.COOKIE_SECURE === '1',
  path: '/',
};
const sessionLifetime = 8 * 60 * 60 * 1000;
const fakeHash = hashPassword(randomToken());
const failureWindow = new Map();
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD'].includes(req.method) && !req.is('application/json'))
    return res.status(415).json({ error: 'Send a JSON request.' });
  next();
});
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.post('/api/login', (req, res) => {
  const b = req.body || {};
  const key = req.ip;
  const last = failureWindow.get(key);
  const time = Date.now();
  if (last && last.until > time && last.attempts >= 20)
    throw new InputError('Too many attempts. Try again in a few minutes.', 429);
  const user = one(
    'SELECT id,password_hash,active FROM users WHERE username=?',
    typeof b.username === 'string' ? b.username.trim() : '',
  );
  const valid =
    typeof b.password === 'string' &&
    b.password.length <= 256 &&
    matchesPassword(b.password, user?.password_hash || fakeHash);
  if (!valid || !user?.active) {
    failureWindow.set(
      key,
      last && last.until > time
        ? { ...last, attempts: last.attempts + 1 }
        : { until: time + 300000, attempts: 1 },
    );
    throw new InputError('Incorrect username or password.', 401);
  }
  failureWindow.delete(key);
  const token = randomToken();
  run('DELETE FROM sessions WHERE expires<=?', time);
  run(
    'INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)',
    tokenDigest(token),
    user.id,
    time + sessionLifetime,
  );
  res
    .cookie('strategy_session', token, { ...cookieOptions, maxAge: sessionLifetime })
    .json({ ok: true });
});
app.use('/api', (req, res, next) => {
  const token = (req.headers.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('strategy_session='))
    ?.slice(17);
  req.sessionKey = tokenDigest(token || '');
  req.actor = one(
    `SELECT u.id,u.full_name AS fullName,u.username,u.role,u.department FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE u.active=1 AND s.token=? AND s.expires>?`,
    req.sessionKey,
    Date.now(),
  );
  if (!req.actor) return res.status(401).json({ error: 'Sign in to continue.' });
  next();
});
const allow =
  (...roles) =>
  (req, _res, next) => {
    requireValue(roles.includes(req.actor.role), 'Your role cannot access this function.', 403);
    next();
  };
app.post('/api/logout', (req, res) => {
  run('DELETE FROM sessions WHERE token=?', req.sessionKey);
  res.clearCookie('strategy_session', cookieOptions).json({ ok: true });
});
app.get('/api/bootstrap', (req, res) => res.json(workspace(req.actor)));
app.get('/api/dashboard', allow('management'), (req, res) => res.json(workspace(req.actor, req.query)));
function mutation(event, operation, status = 200) {
  return (req, res) => {
    requireValue(
      req.body && typeof req.body === 'object' && !Array.isArray(req.body),
      'A request object is required.',
    );
    const id = req.params.id ? identifier(req.params.id) : null;
    const result = transaction(() => {
      const resultId = operation(id, req.actor, req.body, req);
      audit(req.actor, event + ' #' + resultId);
      return resultId;
    });
    res.status(status).json({ id: result });
  };
}
function resource(name, roles, save, editRoles = roles) {
  app.post('/api/' + name, allow(...roles), mutation('Created ' + name, save, 201));
  app.patch('/api/' + name + '/:id', allow(...editRoles), mutation('Updated ' + name, save));
}
resource('goals', ['planner'], (id, a, b) => saveGoal(id, b));
resource('initiatives', ['planner'], (id, a, b) => saveInitiative(id, b));
resource('milestones', ['planner', 'owner'], saveMilestone);
resource('kpis', ['planner', 'kpi'], saveKpi, ['planner', 'kpi', 'owner']);
resource('risks', ['owner'], saveRisk);
resource('users', ['admin'], saveAccount);
app.post(
  '/api/initiatives/:id/progress',
  allow('owner'),
  mutation('Updated initiative progress', updateProgress),
);
for (const kind of ['goals', 'initiatives']) {
  app.post(
    '/api/' + kind + '/:id/submit',
    allow('planner'),
    mutation('Submitted ' + kind, (id) => review(kind, id, 'submit')),
  );
  app.post(
    '/api/' + kind + '/:id/decision',
    allow('management'),
    mutation('Reviewed ' + kind, (id, a, b) => review(kind, id, b.action === 'submit' ? '' : b.action)),
  );
}
app.post(
  '/api/departments',
  allow('planner'),
  mutation('Saved department', (id, a, b) => saveDepartment(b)),
);
app.patch(
  '/api/settings',
  allow('admin'),
  mutation('Changed reminder window', (id, a, b) => saveSettings(b)),
);
app.post(
  '/api/notifications/:id/read',
  mutation('Read notification', (id, a) => {
    requireValue(
      run('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?', id, a.id).changes,
      'Notification not found.',
      404,
    );
    return id;
  }),
);
const reportAccess = allow('management', 'planner', 'head');
app.post(
  '/api/reports',
  reportAccess,
  mutation('Generated report', (id, a, b) => generateReport(a, b.kind), 201),
);
app.get('/api/reports/:id', reportAccess, (req, res) =>
  res.json(getReport(identifier(req.params.id), req.actor)),
);
app.get('/api/reports/:id/excel', reportAccess, async (req, res) => {
  const id = identifier(req.params.id);
  const buffer = await workbook(getReport(id, req.actor));
  res.attachment('strategic-report-' + id + '.xlsx').send(Buffer.from(buffer));
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (fs.existsSync(path.join(root, 'dist', 'index.html'))) {
  app.use(express.static(path.join(root, 'dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
}
app.use((err, _req, res, _next) => {
  if (err instanceof InputError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed')
    return res.status(400).json({ error: 'Invalid request format.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
  console.error(err.message);
  res.status(500).json({ error: 'The database operation could not be completed. Please try again.' });
});
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 4000);
  deliverReminders();
  setInterval(deliverReminders, 60_000).unref();
  app.listen(port, () =>
    console.log(
      'Strategic Plan Monitor on http://localhost:' +
        port +
        '\nInitial account file: ' +
        dbPath +
        '.accounts.json',
    ),
  );
}
