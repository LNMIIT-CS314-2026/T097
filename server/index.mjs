import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBootstrap, createInitiative, updateInitiative, updateInitiativeProgress, updateMilestoneStatus, resetDemoData } from './services/strategicPlanService.mjs';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
app.use(express.json({ limit: '1mb' }));

function currentDemoActor(req) {
  const role = String(req.get('x-demo-role') || 'management');
  const actorMap = {
    planner: { role: 'planner', userId: 1 },
    owner: { role: 'owner', userId: 2 },
    management: { role: 'management', userId: 3 },
    admin: { role: 'admin', userId: 3 },
  };
  return actorMap[role] || actorMap.management;
}

function requireRole(...roles) {
  return (req, res, next) => {
    const actor = currentDemoActor(req);
    if (!roles.includes(actor.role)) {
      return res.status(403).json({ error: `This demo action requires ${roles.join(' or ')} role.` });
    }
    req.demoActor = actor;
    next();
  };
}

function sendServiceResult(res, result) {
  return res.status(result.status).json(result.body);
}

app.get('/api/health', (_req, res) => res.json({ ok: true, database: 'sqlite', architecture: 'REST API + service layer + data access layer' }));
app.get('/api/bootstrap', (_req, res) => res.json(getBootstrap()));
app.post('/api/initiatives', requireRole('planner'), (req, res) => sendServiceResult(res, createInitiative(req.body)));
app.patch('/api/initiatives/:id', requireRole('planner'), (req, res) => sendServiceResult(res, updateInitiative(Number(req.params.id), req.body)));
app.post('/api/initiatives/:id/progress', requireRole('owner'), (req, res) => sendServiceResult(res, updateInitiativeProgress(Number(req.params.id), req.demoActor, req.body)));
app.patch('/api/milestones/:id', requireRole('owner'), (req, res) => sendServiceResult(res, updateMilestoneStatus(Number(req.params.id), req.demoActor, req.body)));
app.post('/api/reset', (_req, res) => res.json(resetDemoData()));
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));

const distDir = path.join(root, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Unexpected server error. Check the server terminal for details.' });
});

app.listen(PORT, () => {
  console.log(`T097 API listening on http://localhost:${PORT}`);
  console.log(`SQLite database file: ${path.join(here, 'data', 'strategic-plan.sqlite')}`);
  console.log('API mutations are validated by the service layer before the data access layer persists them.');
});
