export const roleNames = {
  management: 'Institute Management',
  planner: 'Strategic Planning Officer',
  owner: 'Initiative Owner',
  head: 'Department Head',
  kpi: 'KPI / Performance Officer',
  admin: 'Administrator',
};
const navigation = {
  management: [
    'overview',
    'goals',
    'initiatives',
    'milestones',
    'kpis',
    'reviews',
    'reports',
    'notifications',
  ],
  planner: [
    'overview',
    'goals',
    'initiatives',
    'milestones',
    'kpis',
    'departments',
    'reports',
    'notifications',
  ],
  owner: ['overview', 'progress', 'milestones', 'kpis', 'risks', 'notifications'],
  head: ['overview', 'initiatives', 'milestones', 'kpis', 'reports', 'notifications'],
  kpi: ['kpis'],
  admin: ['users', 'settings', 'audit'],
};
export const labels = {
  overview: 'Overview',
  goals: 'Strategic goals',
  initiatives: 'Initiatives',
  milestones: 'Milestones',
  kpis: 'KPI performance',
  reviews: 'Review queue',
  reports: 'Reports',
  notifications: 'Notifications',
  progress: 'My progress',
  departments: 'Departments',
  risks: 'Risks',
  users: 'User accounts',
  settings: 'Notification rules',
  audit: 'Activity log',
};
export const homePage = (role) => navigation[role][0];
export default function Sidebar({ actor, page, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="brand-name">
          strat<span>wise</span>
        </div>
      </div>
      <nav className="nav-list" aria-label="Main navigation">
        {navigation[actor.role].map((id) => (
          <button
            key={id}
            className={'nav-item ' + (page === id ? 'active' : '')}
            aria-current={page === id ? 'page' : undefined}
            onClick={() => onNavigate(id)}
          >
            {labels[id]}
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-user-copy">
        <strong>{actor.fullName}</strong>
        <small>{roleNames[actor.role]}</small>
      </div>
    </aside>
  );
}
