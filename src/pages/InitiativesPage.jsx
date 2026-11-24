import { useMemo, useState } from 'react';
import InitiativeTable from '../components/InitiativeTable.jsx';

export default function InitiativesPage({ data, role, onNew, onEdit, onView }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const filtered = useMemo(() => data.initiatives.filter(item => {
    const queryMatch = `${item.title} ${item.goalTitle} ${item.ownerName}`.toLowerCase().includes(query.toLowerCase());
    const filterMatch = filter === 'all' || (filter === 'delayed' ? item.isDelayed : filter === 'completed' ? item.status === 'Completed' : item.status === filter);
    return queryMatch && filterMatch;
  }), [data.initiatives, query, filter]);
  const canEdit = role === 'planner';
  return <div className="page-content">
    <div className="page-intro-row"><div><div className="eyebrow">UC-006 · MANAGE STRATEGIC INITIATIVE</div><h1>Initiative register</h1><p>Connect each initiative to a strategic goal and a responsible owner.</p></div>{canEdit && <button className="button primary" onClick={onNew}><span className="button-plus">+</span> New initiative</button>}</div>
    <div className="stat-grid small-stat-grid"><div className="mini-stat"><span>Total initiatives</span><strong>{data.initiatives.length}</strong></div><div className="mini-stat"><span>In progress</span><strong>{data.initiatives.filter(i => i.status === 'In Progress' && !i.isDelayed).length}</strong></div><div className="mini-stat"><span>Delayed</span><strong className="orange-text">{data.initiatives.filter(i => i.isDelayed).length}</strong></div><div className="mini-stat"><span>Completed</span><strong className="green-text">{data.initiatives.filter(i => i.status === 'Completed').length}</strong></div></div>
    <section className="panel initiatives-register-panel"><div className="register-toolbar"><div><h2>All initiatives</h2><p>Records are loaded from the server-side database.</p></div><div className="table-controls"><label className="search-field"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search initiatives…" /></label><select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter by status"><option value="all">All statuses</option><option value="Not Started">Not started</option><option value="In Progress">In progress</option><option value="completed">Completed</option><option value="delayed">Delayed</option></select></div></div>
      <InitiativeTable initiatives={filtered} onView={onView} onEdit={onEdit} canEdit={canEdit} />
      <div className="register-footer"><span>Showing {filtered.length} of {data.initiatives.length} initiatives</span><span>Target dates and delayed statuses are evaluated by the API.</span></div>
    </section>
    <div className="note-row"><span>ⓘ</span><p><strong>Validation implemented:</strong> required title, existing strategic goal, valid initiative owner, start and target dates, and progress from 0 to 100. Only the Planning Officer demo role can create or edit initiative details.</p></div>
  </div>;
}
