import { all, one, initiativesFor, milestonesFor, kpisFor, reminders, today } from '../repositories.mjs';
import { requireValue, statuses } from '../validation.mjs';

export function workspace(actor, filters = {}, { refreshAlerts = true } = {}) {
  if (actor.role === 'admin')
    return {
      actor,
      users: all(
        'SELECT id,full_name AS fullName,username,role,department,active FROM users ORDER BY full_name',
      ),
      departments: all('SELECT name FROM departments ORDER BY name'),
      settings: one('SELECT reminder_days AS reminderDays FROM settings'),
      audit: all(
        'SELECT a.id,a.event,a.created_at AS createdAt,u.full_name AS actor FROM audit a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 100',
      ),
    };
  if (actor.role === 'kpi') {
    const initiatives = all('SELECT id,title FROM initiatives ORDER BY title');
    return {
      actor,
      initiatives,
      kpis: kpisFor(
        initiatives.map((i) => i.id),
        true,
      ),
      unavailable: [],
    };
  }
  let initiatives = initiativesFor(actor);
  const scoped = ['head', 'owner'].includes(actor.role);
  const linkedGoals = new Set(initiatives.map((i) => i.goalId));
  let goals = all(
    'SELECT id,title,description,start_date AS startDate,target_date AS dueDate,status,review FROM strategic_goals ORDER BY id',
  ).filter((g) => !scoped || linkedGoals.has(g.id));
  requireValue(
    Object.keys(filters).every((k) => ['goalId', 'status'].includes(k)),
    'Invalid dashboard filters.',
  );
  if (filters.goalId) {
    const goal = goals.find((g) => g.id === Number(filters.goalId));
    requireValue(goal, 'Select a valid goal filter.');
    goals = [goal];
    initiatives = initiatives.filter((i) => i.goalId === goal.id);
  }
  if (filters.status) {
    requireValue(
      [...statuses, 'Delayed', 'Incomplete'].includes(filters.status),
      'Select a valid status filter.',
    );
    initiatives = initiatives.filter((i) =>
      filters.status === 'Delayed'
        ? i.isDelayed
        : filters.status === 'Incomplete'
          ? !['Completed', 'Cancelled'].includes(i.status)
          : i.status === filters.status,
    );
    goals = goals.filter((g) => initiatives.some((i) => i.goalId === g.id));
  }
  const ids = initiatives.map((i) => i.id);
  const unavailable = [];
  function section(name, load) {
    try {
      return load();
    } catch (error) {
      console.error(name + ' retrieval failed:', error.message);
      unavailable.push(name);
      return [];
    }
  }
  const milestones = section('Milestones', () => milestonesFor(ids));
  const kpis = section('KPIs', () =>
    kpisFor(ids, !scoped && !filters.status).filter(
      (k) => !filters.goalId || k.goalId === Number(filters.goalId),
    ),
  );
  if (refreshAlerts) reminders(actor, initiatives, milestones);
  return {
    actor,
    initiatives,
    milestones,
    kpis,
    unavailable,
    serverDate: today(),
    goals: goals.map((g) => {
      const linked = initiatives.filter((i) => i.goalId === g.id);
      return {
        ...g,
        progress: linked.length
          ? Math.round(linked.reduce((sum, i) => sum + i.progress, 0) / linked.length)
          : null,
      };
    }),
    users:
      actor.role === 'planner'
        ? all(
            "SELECT id,full_name AS fullName,department,role FROM users WHERE role='owner' AND active=1 ORDER BY full_name",
          )
        : [],
    departments: actor.role === 'planner' ? all('SELECT name FROM departments ORDER BY name') : [],
    risks:
      actor.role === 'owner'
        ? all(
            'SELECT id,initiative_id AS initiativeId,title,mitigation,status FROM risks WHERE initiative_id IN (SELECT value FROM json_each(?)) ORDER BY id',
            JSON.stringify(ids),
          )
        : [],
    notifications: all(
      'SELECT id,message,is_read AS isRead,created_at AS createdAt FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 100',
      actor.id,
    ),
    progressUpdates: all(
      `SELECT p.id,p.initiative_id AS initiativeId,i.title,p.new_progress AS progress,p.note,p.created_at AS createdAt
      FROM progress_updates p JOIN initiatives i ON i.id=p.initiative_id WHERE i.id IN (SELECT value FROM json_each(?)) ORDER BY p.id DESC LIMIT 12`,
      JSON.stringify(ids),
    ),
    reports: ['planner', 'head', 'management'].includes(actor.role)
      ? all(
          'SELECT id,kind,created_at AS createdAt FROM reports WHERE user_id=? AND role=? AND department=? ORDER BY id DESC',
          actor.id,
          actor.role,
          actor.department,
        )
      : [],
  };
}
