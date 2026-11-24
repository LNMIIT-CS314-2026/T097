const navigation = {
  management: [
    { id: 'overview', icon: '◫', label: 'Performance overview' },
    { id: 'initiatives', icon: '▤', label: 'Initiatives' },
    { id: 'kpis', icon: '⌁', label: 'KPI performance' },
  ],
  planner: [
    { id: 'overview', icon: '◫', label: 'Workspace overview' },
    { id: 'initiatives', icon: '▤', label: 'Manage initiatives' },
    { id: 'kpis', icon: '⌁', label: 'KPI performance' },
  ],
  owner: [
    { id: 'overview', icon: '◫', label: 'My overview' },
    { id: 'progress', icon: '✓', label: 'Update progress' },
    { id: 'kpis', icon: '⌁', label: 'KPI performance' },
  ],
};

export default function Sidebar({ role, page, onNavigate, data }) {
  const roleName = { management: 'Institute Management', planner: 'Strategic Planning Officer', owner: 'Initiative Owner' }[role];
  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark"><span /><span /><span /></div>
        <div><div className="brand-name">strat<span>wise</span></div><div className="brand-caption">STRATEGY MONITOR</div></div>
      </div>
      <div className="workspace-caption">WORKSPACE</div>
      <div className="workspace-switcher">
        <div className="workspace-monogram">LN</div>
        <div className="workspace-text"><strong>Institutional Plan</strong><small>2026–2027 cycle</small></div>
      </div>
      <div className="nav-caption">MENU</div>
      <nav className="nav-list" aria-label="Main navigation">
        {(navigation[role] || navigation.management).map(item => (
          <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => onNavigate(item.id)}>
            <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-demo-note"><span className="pulse-dot" /><div><strong>Prototype environment</strong><small>Server API - Central SQLite DB</small></div></div>
      <div className="sidebar-user">
        <div className="user-avatar">{role === 'planner' ? 'NS' : role === 'owner' ? 'NH' : 'MM'}</div>
        <div className="sidebar-user-copy"><strong>{roleName}</strong><small>Team T097 - CS314</small></div>
      </div>
    </aside>
  );
}
