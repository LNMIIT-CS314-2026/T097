import StatCard from '../components/StatCard.jsx';
import InitiativeTable from '../components/InitiativeTable.jsx';

function goalProgress(goal, initiatives) {
  const linked = initiatives.filter(item => item.goalId === goal.id);
  return linked.length ? Math.round(linked.reduce((total, item) => total + item.progress, 0) / linked.length) : 0;
}

export default function DashboardPage({ data, role, onNavigate, onViewInitiative }) {
  const assigned = role === 'owner' ? data.initiatives.filter(i => i.ownerId === 2) : data.initiatives;
  const average = assigned.length ? Math.round(assigned.reduce((sum, i) => sum + i.progress, 0) / assigned.length) : 0;
  const delayed = assigned.filter(i => i.isDelayed);
  const completed = assigned.filter(i => i.status === 'Completed').length;

  return (
    <div className="page-content">
      <div className="page-intro-row">
        <div>
          <h1>{role === 'management' ? 'Performance Overview' : role === 'planner' ? 'Planning Overview' : 'My Overview'}</h1>
          <p>Strategic plan progress summary.</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Total initiatives" value={assigned.length} detail={`${completed} completed`} icon="▤" tone="blue" />
        <StatCard label="Average progress" value={`${average}%`} detail="Across all initiatives" icon="↗" tone="green" />
        <StatCard label="Delayed" value={delayed.length} detail="Past target date" icon="!" tone="orange" />
      </div>

      <section className="panel goal-panel">
        <div className="section-heading">
          <div><h2>Goal Progress</h2></div>
          <button className="text-button" onClick={() => onNavigate('initiatives')}>View all →</button>
        </div>
        <div className="goal-list">
          {data.goals.map(goal => {
            const progress = goalProgress(goal, assigned);
            const linked = assigned.filter(i => i.goalId === goal.id);
            return (
              <div className="goal-row" key={goal.id}>
                <div className="goal-row-head">
                  <div className="goal-icon">{String(goal.id).padStart(2, '0')}</div>
                  <div className="goal-copy">
                    <strong>{goal.title}</strong>
                    <small>{linked.length} initiative{linked.length === 1 ? '' : 's'}</small>
                  </div>
                  <strong className="goal-percent">{progress}%</strong>
                </div>
                <div className="progress-track goal-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel initiatives-panel">
        <div className="section-heading">
          <div><h2>{role === 'owner' ? 'Your Initiatives' : 'Initiatives'}</h2></div>
          <button className="text-button" onClick={() => onNavigate(role === 'owner' ? 'progress' : 'initiatives')}>
            {role === 'owner' ? 'Update progress' : 'Open register'} →
          </button>
        </div>
        <InitiativeTable initiatives={[...assigned].sort((a, b) => Number(b.isDelayed) - Number(a.isDelayed)).slice(0, 5)} onView={onViewInitiative} compact />
      </section>

      {(() => {
        const list = role === 'owner' ? data.notifications.filter(n => n.userId === 2) : data.notifications;
        if (!list || list.length === 0) return null;
        return (
          <section className="panel notification-panel">
            <div className="section-heading">
              <div><h2>{role === 'owner' ? 'My Notifications' : 'Notifications'}</h2></div>
              <span className="count-badge">{list.length}</span>
            </div>
            <div className="notification-list">
              {list.map(n => (
                <div className="notification-item" key={n.id}>
                  <span className="notification-dot">●</span>
                  <div className="notification-copy">
                    <strong>{n.message}</strong>
                    <small>{n.userName} · {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })()}
    </div>
  );
}
