import { resetAndSeed } from '../db.mjs';
import {
  goalRepository, userRepository, initiativeRepository, milestoneRepository,
  kpiRepository, progressUpdateRepository, notificationRepository,
} from '../repositories.mjs';

const today = () => new Date().toISOString().slice(0, 10);
const stamp = () => new Date().toISOString();
const validStatuses = new Set(['Not Started', 'In Progress', 'Completed']);

function presentInitiative(id) {
  const row = initiativeRepository.findDetails(id);
  if (!row) return null;
  const delayed = row.due_date < today() && row.status !== 'Completed';
  return {
    id: row.id, title: row.title, description: row.description,
    goalId: row.goal_id, goalTitle: row.goal_title, ownerId: row.owner_id, ownerName: row.owner_name,
    startDate: row.start_date, dueDate: row.due_date, progress: row.progress,
    status: row.status, displayStatus: delayed ? 'Delayed' : row.status, isDelayed: delayed,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function getBootstrap() {
  const milestones = milestoneRepository.listAll().map(item => ({ ...item, isDelayed: item.dueDate < today() && item.status !== 'Completed' }));
  return {
    goals: goalRepository.list(),
    users: userRepository.list(),
    initiatives: initiativeRepository.listIds().map(row => presentInitiative(row.id)),
    milestones,
    kpis: kpiRepository.listAll(),
    progressUpdates: progressUpdateRepository.listRecent(),
    notifications: notificationRepository.listRecent(),
    serverDate: today(),
  };
}

function validateInitiative(body) {
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const goalId = Number(body.goalId);
  const ownerId = Number(body.ownerId);
  const startDate = String(body.startDate || '').trim();
  const dueDate = String(body.dueDate || '').trim();
  const progress = Number(body.progress ?? 0);
  const status = String(body.status || 'Not Started');
  if (!title) return { error: 'Initiative title is required.' };
  if (title.length > 140) return { error: 'Initiative title must be 140 characters or fewer.' };
  if (!goalRepository.exists(goalId)) return { error: 'Select an existing strategic goal.' };
  const owner = userRepository.findById(ownerId);
  if (!owner || owner.role !== 'owner') return { error: 'Select a valid Initiative Owner.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { error: 'Enter valid start and target dates.' };
  if (dueDate < startDate) return { error: 'Target date cannot be earlier than the start date.' };
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) return { error: 'Progress must be a whole number from 0 to 100.' };
  if (!validStatuses.has(status)) return { error: 'Select a valid initiative status.' };
  return { value: { title, description, goalId, ownerId, startDate, dueDate, progress, status } };
}

export function createInitiative(body) {
  const validated = validateInitiative(body);
  if (validated.error) return { status: 400, body: { error: validated.error } };
  const result = initiativeRepository.create({ ...validated.value, now: stamp() });
  return { status: 201, body: { initiative: presentInitiative(Number(result.lastInsertRowid)), message: 'Initiative saved to the central database.' } };
}

export function updateInitiative(id, body) {
  if (!initiativeRepository.findById(id)) return { status: 404, body: { error: 'Initiative not found.' } };
  const validated = validateInitiative(body);
  if (validated.error) return { status: 400, body: { error: validated.error } };
  initiativeRepository.update(id, { ...validated.value, now: stamp() });
  return { status: 200, body: { initiative: presentInitiative(id), message: 'Initiative updated in the central database.' } };
}

export function updateInitiativeProgress(id, actor, body) {
  const existing = initiativeRepository.findById(id);
  if (!existing) return { status: 404, body: { error: 'Initiative not found.' } };
  if (existing.owner_id !== actor.userId) return { status: 403, body: { error: 'This initiative is not assigned to the selected demo owner.' } };
  const progress = Number(body.progress);
  const status = String(body.status || 'In Progress');
  const note = String(body.note || '').trim();
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) return { status: 400, body: { error: 'Progress must be a whole number from 0 to 100.' } };
  if (!validStatuses.has(status)) return { status: 400, body: { error: 'Select a valid initiative status.' } };
  const now = stamp();
  initiativeRepository.saveProgress(id, progress, status, now);
  progressUpdateRepository.create({ initiativeId: id, ownerId: actor.userId, previousProgress: existing.progress, newProgress: progress, status, note, createdAt: now });
  const updated = initiativeRepository.findById(id);
  if (updated.due_date < today() && updated.status !== 'Completed') {
    notificationRepository.create({ userId: actor.userId, message: `${updated.title} is past its target date and remains ${updated.status.toLowerCase()}.`, createdAt: now });
  }
  return { status: 200, body: { initiative: presentInitiative(id), message: 'Progress update saved and reflected on the dashboard.' } };
}

export function updateMilestoneStatus(id, actor, body) {
  const milestone = milestoneRepository.findWithOwner(id);
  if (!milestone) return { status: 404, body: { error: 'Milestone not found.' } };
  if (milestone.owner_id !== actor.userId) return { status: 403, body: { error: 'This milestone is not assigned to the selected demo owner.' } };
  const status = String(body.status || 'Not Started');
  if (!validStatuses.has(status)) return { status: 400, body: { error: 'Select a valid milestone status.' } };
  milestoneRepository.updateStatus(id, status);
  return { status: 200, body: { message: 'Milestone status saved to the central database.' } };
}

export function resetDemoData() {
  resetAndSeed();
  return { ok: true, message: 'The central demonstration database has been reset.' };
}
