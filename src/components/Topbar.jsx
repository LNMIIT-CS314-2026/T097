export default function Topbar({ page, role, onRoleChange, onReset, refreshing }) {
  const pageNames = {
    overview: role === 'management' ? 'Performance overview' : role === 'planner' ? 'Workspace overview' : 'My overview',
    initiatives: role === 'planner' ? 'Manage initiatives' : 'Initiatives',
    progress: 'Update initiative progress',
    kpis: 'KPI performance',
  };
  return (
    <header className="topbar">
      <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{pageNames[page] || 'Overview'}</strong></div>
      <div className="topbar-right">
        <span className="demo-chip"><i /> PROTOTYPE</span>
        <label className="role-label" htmlFor="role-preview">Preview role</label>
        <select id="role-preview" value={role} onChange={e => onRoleChange(e.target.value)} className="role-select">
          <option value="management">Institute Management</option>
          <option value="planner">Strategic Planning Officer</option>
          <option value="owner">Initiative Owner</option>
        </select>
        <button className="reset-button" title="Reset sample data in central database" onClick={onReset} disabled={refreshing}>↻</button>
        <div className="header-avatar">{role === 'planner' ? 'NS' : role === 'owner' ? 'NH' : 'MM'}</div>
      </div>
    </header>
  );
}
