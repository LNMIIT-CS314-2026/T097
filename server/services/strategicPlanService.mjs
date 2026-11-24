import { one, run, all, now, today as todayCampus, notifyTeam, notify } from '../repositories.mjs';
import {
  requireValue,
  textField,
  dateField,
  choice,
  percent,
  identifier,
  numberField,
  statuses,
} from '../validation.mjs';

export function goalRecord(id) {
  const row = one('SELECT * FROM strategic_goals WHERE id=?', identifier(id));
  requireValue(row, 'Goal not found.', 404);
  return row;
}
export function initiativeRecord(id) {
  const row = one('SELECT * FROM initiatives WHERE id=?', identifier(id));
  requireValue(row, 'Initiative not found.', 404);
  return row;
}
function writable(row) {
  requireValue(!['Completed', 'Cancelled'].includes(row.status), 'This initiative is closed.');
}
function assigned(row, actor) {
  if (actor.role === 'owner')
    requireValue(row.owner_id === actor.id, 'This initiative is assigned to another owner.', 403);
}
function period(body) {
  const start = dateField(body.startDate, 'start date');
  const end = dateField(body.dueDate, 'target date');
  requireValue(start <= end, 'Target date cannot precede the start date.');
  return [start, end];
}
export function saveGoal(id, b) {
  const old = id ? goalRecord(id) : null;
  const title = textField(b.title, 'Goal title');
  const description = textField(b.description, 'Description', false);
  const [start, end] = period(b);
  const status = choice(b.status, ['Active', 'Inactive', 'Completed'], 'goal status');
  if (!old)
    return Number(
      run(
        "INSERT INTO strategic_goals(title,description,start_date,target_date,status,review) VALUES(?,?,?,?,?,'Draft')",
        title,
        description,
        start,
        end,
        status,
      ).lastInsertRowid,
    );
  requireValue(old.review !== 'Under Review', 'Wait for the management review before editing.');
  run(
    'UPDATE strategic_goals SET title=?,description=?,start_date=?,target_date=?,status=? WHERE id=?',
    title,
    description,
    start,
    end,
    status,
    id,
  );
  for (const user of all('SELECT DISTINCT owner_id FROM initiatives WHERE goal_id=?', id))
    notifyTeam(user.owner_id, 'Strategic goal updated: ' + title);
  return id;
}

function checkCompletion(id) {
  requireValue(
    !one(
      "SELECT id FROM milestones WHERE initiative_id=? AND required=1 AND (status<>'Completed' OR progress<>100)",
      id,
    ),
    'Complete all required milestones before completing the initiative.',
  );
}
function checkState(progress, status) {
  if (status === 'Completed') requireValue(progress === 100, 'Completed work requires 100% progress.');
  if (['Planned', 'Not Started'].includes(status))
    requireValue(progress === 0, 'Work that has not started must have 0% progress.');
}
export function saveInitiative(id, b) {
  const old = id ? initiativeRecord(id) : null;
  if (old) {
    writable(old);
    requireValue(old.review !== 'Under Review', 'Wait for the management review before editing.');
  }
  const title = textField(b.title, 'Initiative title');
  requireValue(title.length <= 140, 'Initiative title must be 140 characters or fewer.');
  const description = textField(b.description, 'Description', false);
  const goal = goalRecord(b.goalId);
  if (!old || old.goal_id !== goal.id)
    requireValue(goal.status === 'Active', 'Select an active strategic goal.');
  const owner = b.ownerId ? identifier(b.ownerId) : null;
  if (owner !== null)
    requireValue(
      one("SELECT id FROM users WHERE id=? AND active=1 AND role='owner'", owner),
      'Select an active Initiative Owner.',
    );
  if (old && old.status !== 'Planned')
    requireValue(owner, 'An active initiative requires an assigned owner.');
  const [start, end] = period(b);
  if (old) {
    run(
      'UPDATE initiatives SET title=?,description=?,goal_id=?,owner_id=?,start_date=?,due_date=?,updated_at=? WHERE id=?',
      title,
      description,
      goal.id,
      owner,
      start,
      end,
      now(),
      id,
    );
    if (old.owner_id !== owner) notify(old.owner_id, 'You are no longer assigned to ' + old.title + '.');
  } else {
    id = Number(
      run(
        `INSERT INTO initiatives(title,description,goal_id,owner_id,start_date,due_date,progress,status,created_at,updated_at)
      VALUES(?,?,?,?,?,?,0,'Planned',?,?)`,
        title,
        description,
        goal.id,
        owner,
        start,
        end,
        now(),
        now(),
      ).lastInsertRowid,
    );
  }
  notifyTeam(owner, 'Initiative ' + (old ? 'updated: ' : 'assigned: ') + title);
  return id;
}

export function review(kind, id, action) {
  const isGoal = kind === 'goals';
  const row = isGoal ? goalRecord(id) : initiativeRecord(id);
  const table = isGoal ? 'strategic_goals' : 'initiatives';
  if (!isGoal) writable(row);
  if (action === 'submit') {
    requireValue(
      ['Draft', 'Revision Required'].includes(row.review),
      'This item is not ready for submission.',
    );
    run('UPDATE ' + table + " SET review='Under Review' WHERE id=?", id);
    for (const user of all("SELECT id FROM users WHERE active=1 AND role='management'"))
      notify(user.id, 'Review requested: ' + row.title);
  } else {
    choice(action, ['approve', 'reject'], 'review decision');
    requireValue(row.review === 'Under Review', 'This item is not awaiting review.');
    if (action === 'approve' && !isGoal) {
      requireValue(row.owner_id, 'Assign an owner before activating the initiative.');
      requireValue(goalRecord(row.goal_id).status === 'Active', 'The linked goal must be active.');
      run("UPDATE initiatives SET status='In Progress' WHERE id=?", id);
    }
    run(
      'UPDATE ' + table + ' SET review=? WHERE id=?',
      action === 'approve' ? 'Approved' : 'Revision Required',
      id,
    );
    for (const user of all("SELECT id FROM users WHERE active=1 AND role='planner'"))
      notify(user.id, (action === 'approve' ? 'Approved: ' : 'Revision requested: ') + row.title);
    if (!isGoal) notifyTeam(row.owner_id, 'Initiative review updated: ' + row.title);
  }
  return id;
}

function milestoneState(id, parentId, b) {
  const m = one('SELECT * FROM milestones WHERE id=?', identifier(id));
  requireValue(m, 'Milestone not found.', 404);
  requireValue(m.initiative_id === parentId, 'Select a milestone belonging to this initiative.');
  const progress = percent(b.progress);
  const status = milestoneStatus(b.status, m);
  checkState(progress, status);
  run('UPDATE milestones SET progress=?,status=? WHERE id=?', progress, status, id);
}

function milestoneStatus(value, existing) {
  requireValue(
    !existing || !['Completed', 'Cancelled'].includes(existing.status) || value === existing.status,
    'This milestone is closed.',
  );
  const allowed = ['Not Started', 'In Progress', 'Completed'];
  if (
    existing &&
    (existing.status === 'Cancelled' ||
      (existing.status === 'In Progress' && existing.due_date < todayCampus()))
  )
    allowed.push('Cancelled');
  return choice(value, allowed, 'milestone status');
}

export function updateProgress(id, actor, b) {
  const row = initiativeRecord(id);
  assigned(row, actor);
  writable(row);
  const progress = percent(b.progress);
  const status = choice(b.status, statuses, 'initiative status');
  if (status !== 'Planned')
    requireValue(row.review === 'Approved', 'The initiative must be approved before work starts.');
  if (status === 'Cancelled')
    requireValue(
      row.status === 'In Progress' && row.due_date < todayCampus(),
      'Only delayed initiatives can be cancelled.',
    );
  checkState(progress, status);
  if (b.milestone) milestoneState(b.milestone.id, id, b.milestone);
  if (status === 'Completed') checkCompletion(id);
  run('UPDATE initiatives SET progress=?,status=?,updated_at=? WHERE id=?', progress, status, now(), id);
  run(
    'INSERT INTO progress_updates(initiative_id,owner_id,previous_progress,new_progress,status,note,created_at) VALUES(?,?,?,?,?,?,?)',
    id,
    actor.id,
    row.progress,
    progress,
    status,
    textField(b.note, 'Note', false),
    now(),
  );
  notifyTeam(actor.id, 'Progress updated for ' + row.title + ' to ' + progress + '%.');
  return id;
}

export function saveMilestone(id, actor, b) {
  const existing = id ? one('SELECT * FROM milestones WHERE id=?', id) : null;
  if (id) requireValue(existing, 'Milestone not found.', 404);
  const row = initiativeRecord(existing?.initiative_id ?? b.initiativeId);
  assigned(row, actor);
  writable(row);
  const title = textField(b.title, 'Milestone title'),
    description = textField(b.description, 'Description', false);
  const due = dateField(b.dueDate, 'due date'),
    required = b.required === false ? 0 : 1;
  const progress = percent(b.progress),
    status = milestoneStatus(b.status, existing);
  checkState(progress, status);
  if (id)
    run(
      'UPDATE milestones SET title=?,description=?,due_date=?,required=?,progress=?,status=? WHERE id=?',
      title,
      description,
      due,
      required,
      progress,
      status,
      id,
    );
  else
    id = Number(
      run(
        'INSERT INTO milestones(initiative_id,title,description,due_date,required,progress,status) VALUES(?,?,?,?,?,?,?)',
        row.id,
        title,
        description,
        due,
        required,
        progress,
        status,
      ).lastInsertRowid,
    );
  notifyTeam(row.owner_id, 'Milestone updated for ' + row.title + ': ' + title);
  return id;
}

const optionalNumber = (v, label) => (v === '' || v == null ? null : numberField(v, label));
export function saveKpi(id, actor, b) {
  const old = id ? one('SELECT * FROM kpis WHERE id=?', id) : null;
  if (id) requireValue(old, 'KPI not found.', 404);
  const current = optionalNumber(b.currentValue, 'Current value');
  if (actor.role === 'owner') {
    requireValue(old?.initiative_id, 'Select an assigned KPI.', 403);
    const parent = initiativeRecord(old.initiative_id);
    assigned(parent, actor);
    run('UPDATE kpis SET current_value=? WHERE id=?', current, id);
    return id;
  }
  const parent = initiativeRecord(b.initiativeId);
  const name = textField(b.name, 'KPI name'),
    description = textField(b.description, 'Description', false),
    unit = textField(b.unit, 'Unit');
  const target = optionalNumber(b.targetValue, 'Target'),
    threshold = optionalNumber(b.threshold, 'Threshold');
  requireValue(target === null || target > 0, 'Target must be greater than zero.');
  requireValue(
    threshold === null || (target !== null && threshold <= target),
    'Threshold must be at or below the target.',
  );
  if (old)
    run(
      'UPDATE kpis SET initiative_id=?,goal_id=?,name=?,description=?,current_value=?,target_value=?,unit=?,threshold=? WHERE id=?',
      parent.id,
      parent.goal_id,
      name,
      description,
      current,
      target,
      unit,
      threshold,
      id,
    );
  else
    id = Number(
      run(
        'INSERT INTO kpis(initiative_id,goal_id,name,description,current_value,target_value,unit,threshold) VALUES(?,?,?,?,?,?,?,?)',
        parent.id,
        parent.goal_id,
        name,
        description,
        current,
        target,
        unit,
        threshold,
      ).lastInsertRowid,
    );
  notifyTeam(parent.owner_id, 'KPI updated for ' + parent.title + ': ' + name);
  return id;
}

export function saveRisk(id, actor, b) {
  const old = id ? one('SELECT * FROM risks WHERE id=?', id) : null;
  if (id) requireValue(old, 'Risk not found.', 404);
  const row = initiativeRecord(old?.initiative_id ?? b.initiativeId);
  assigned(row, actor);
  writable(row);
  const title = textField(b.title, 'Risk'),
    mitigation = textField(b.mitigation, 'Mitigation', false),
    status = choice(b.status, ['Open', 'Resolved'], 'risk status');
  if (id)
    run('UPDATE risks SET title=?,mitigation=?,status=? WHERE id=?', title, mitigation, status, id);
  else
    id = Number(
      run(
        'INSERT INTO risks(initiative_id,title,mitigation,status) VALUES(?,?,?,?)',
        row.id,
        title,
        mitigation,
        status,
      ).lastInsertRowid,
    );
  return id;
}
