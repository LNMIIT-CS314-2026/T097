import { useState } from 'react';
import InitiativeTable from '../components/InitiativeTable.jsx';
export default function InitiativesPage({ data, onNew, onEdit, onView }) {
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState('');
  const rows = data.initiatives.filter(
    (i) =>
      (i.title + ' ' + i.ownerName + ' ' + i.goalTitle).toLowerCase().includes(query.toLowerCase()) &&
      (!status || i.status === status || i.displayStatus === status),
  );
  const planner = data.actor.role === 'planner';
  return (
    <div className="page-content">
      <div className="page-intro-row">
        <h1>Initiative register</h1>
        {planner && (
          <button className="button primary" onClick={onNew}>
            New initiative
          </button>
        )}
      </div>
      <section className="panel">
        <div className="register-toolbar">
          <input
            className="filter-select"
            aria-label="Search initiatives"
            placeholder="Search initiatives"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="filter-select"
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {['', 'Planned', 'In Progress', 'Completed', 'Delayed', 'Cancelled'].map((s) => (
              <option value={s} key={s}>
                {s || 'All statuses'}
              </option>
            ))}
          </select>
        </div>
        <InitiativeTable initiatives={rows} onView={onView} onEdit={onEdit} canEdit={planner} />
      </section>
    </div>
  );
}
