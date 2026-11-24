import assert from 'node:assert/strict';
import { getBootstrap, createInitiative, updateInitiativeProgress, updateMilestoneStatus, resetDemoData } from './strategicPlanService.mjs';

try {
  resetDemoData();
  let state = getBootstrap();
  assert.equal(state.goals.length, 3, 'seeded strategic goals');
  assert.equal(state.initiatives.length, 5, 'seeded initiatives');
  assert.equal(state.milestones.length, 11, 'seeded milestones');
  assert.equal(state.kpis.length, 5, 'seeded KPIs');

  const invalid = createInitiative({ title: '', goalId: 1, ownerId: 2, startDate: '2026-10-01', dueDate: '2027-01-01', progress: 0, status: 'Not Started' });
  assert.equal(invalid.status, 400, 'empty initiative title is rejected');

  const created = createInitiative({ title: 'Smoke test initiative', description: 'Created by smoke test', goalId: 1, ownerId: 2, startDate: '2026-10-01', dueDate: '2027-01-01', progress: 0, status: 'Not Started' });
  assert.equal(created.status, 201, 'valid initiative is created');

  const denied = updateInitiativeProgress(3, { role: 'owner', userId: 2 }, { progress: 50, status: 'In Progress', note: 'Should not update another owner\'s initiative' });
  assert.equal(denied.status, 403, 'owner cannot update another owner initiative');

  const updated = updateInitiativeProgress(1, { role: 'owner', userId: 2 }, { progress: 65, status: 'In Progress', note: 'Smoke test progress update' });
  assert.equal(updated.status, 200, 'assigned owner progress update succeeds');
  assert.equal(getBootstrap().initiatives.find(i => i.id === 1).progress, 65, 'progress persists through database read');

  const milestone = updateMilestoneStatus(3, { role: 'owner', userId: 2 }, { status: 'Completed' });
  assert.equal(milestone.status, 200, 'assigned owner milestone update succeeds');
  console.log('Smoke test passed: database seed, validation, create, owner authorization, progress persistence and milestone update.');
} finally {
  resetDemoData();
}
