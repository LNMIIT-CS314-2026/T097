import { useState } from 'react';
import StatCard from '../components/StatCard.jsx';
import InitiativeTable from '../components/InitiativeTable.jsx';
import DataTable from '../components/DataTable.jsx';
export default function DashboardPage({ data, onViewInitiative, onGoal }) {
  const [goal, setGoal] = useState(''),
    [status, setStatus] = useState('');
  const initiatives = data.initiatives.filter(
    (i) =>
      (!goal || i.goalId === Number(goal)) &&
      (!status ||
        i.displayStatus === status ||
        i.status === status ||
        (status === 'Incomplete' && !['Completed', 'Cancelled'].includes(i.status))),
  );
  const ids = new Set(initiatives.map((i) => i.id));
  const milestones = data.milestones.filter((m) => ids.has(m.initiativeId));
  const kpis = data.kpis.filter(
    (k) =>
      ids.has(k.initiativeId) || (!k.initiativeId && !status && (!goal || k.goalId === Number(goal))),
  );
  const goals = data.goals.filter(
    (g) => (!goal || g.id === Number(goal)) && (!status || initiatives.some((i) => i.goalId === g.id)),
  );
  const incomplete = milestones
    .filter((m) => m.status !== 'Completed')
    .sort((a, b) => Number(b.isDelayed) - Number(a.isDelayed));
  return (
    <div className="page-content">
      <div className="page-intro-row">
        <div>
          <h1>
            {data.actor.role === 'head'
              ? 'Department overview'
              : data.actor.role === 'owner'
                ? 'My overview'
                : 'Strategic plan overview'}
          </h1>
          <p>
            {data.actor.role === 'head' ? data.actor.department : 'Progress against institutional goals'}{' '}
            · {data.serverDate}
          </p>
        </div>
        <div className="table-controls">
          <select
            className="filter-select"
            aria-label="Goal filter"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          >
            <option value="">All goals</option>
            {data.goals.map((g) => (
              <option value={g.id} key={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            aria-label="Status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {['Planned', 'In Progress', 'Completed', 'Delayed', 'Incomplete', 'Cancelled'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      {!goals.length && !initiatives.length && (
        <p className="panel work-panel">No strategic plan data for this view.</p>
      )}
      <div className="stat-grid">
        <StatCard
          label="Initiatives"
          value={ids.size}
          detail={initiatives.filter((i) => i.status === 'Completed').length + ' completed'}
          icon="▤"
        />
        <StatCard
          label="Delayed initiatives"
          value={initiatives.filter((i) => i.isDelayed).length}
          detail="Past the target date"
          icon="!"
          tone="orange"
        />
        <StatCard
          label="Overdue milestones"
          value={
            data.unavailable.includes('Milestones') ? '—' : incomplete.filter((m) => m.isDelayed).length
          }
          detail="Required and optional milestones"
          icon="◷"
          tone="orange"
        />
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>Goal progress</h2>
        </div>
        <div className="goal-list">
          {goals.map((g) => {
            const linked = initiatives.filter((i) => i.goalId === g.id);
            const value = linked.length
              ? Math.round(linked.reduce((n, i) => n + i.progress, 0) / linked.length)
              : null;
            return (
              <div key={g.id} className="goal-row">
                <div className="goal-row-head">
                  <button className="table-title-button" onClick={() => onGoal(g)}>
                    {g.title}
                  </button>
                  <strong className="goal-percent">
                    {value === null ? 'No initiatives' : value + '%'}
                  </strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: (value || 0) + '%' }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Initiative status</h2>
        </div>
        <InitiativeTable initiatives={initiatives} onView={onViewInitiative} />
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Incomplete milestones</h2>
        </div>
        {data.unavailable.includes('Milestones') ? (
          <p>Milestone data unavailable.</p>
        ) : (
          <DataTable
            columns={['Milestone', 'Initiative', 'Due date', 'Progress', 'Status']}
            rows={incomplete.map((m) => [
              m.title,
              initiatives.find((i) => i.id === m.initiativeId)?.title,
              m.dueDate,
              m.progress + '%',
              m.isDelayed ? 'Overdue' : m.status,
            ])}
            empty="No incomplete milestones."
          />
        )}
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>KPI performance</h2>
        </div>
        {data.unavailable.includes('KPIs') ? (
          <p>KPI data unavailable.</p>
        ) : (
          <DataTable
            columns={['KPI', 'Current', 'Target', 'Unit', 'Status']}
            rows={kpis.map((k) => [k.name, k.currentValue, k.targetValue, k.unit, k.status])}
          />
        )}
      </section>
    </div>
  );
}
