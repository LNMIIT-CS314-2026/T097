import StatusPill from './StatusPill.jsx';

function ProgressBar({ value }) {
  return <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} /></div>;
}

export default function InitiativeTable({ initiatives, onView, onEdit, canEdit = false, compact = false }) {
  if (!initiatives.length) return <div className="empty-state"><div className="empty-icon">▤</div><strong>No initiatives found</strong><p>Try changing the filters or create an initiative.</p></div>;
  return (
    <div className="table-scroll">
      <table className={`data-table ${compact ? 'compact-table' : ''}`}>
        <thead><tr><th>INITIATIVE</th><th>OWNER</th><th>TARGET DATE</th><th>PROGRESS</th><th>STATUS</th>{canEdit && <th />}</tr></thead>
        <tbody>
          {initiatives.map(item => (
            <tr key={item.id}>
              <td><button className="table-title-button" onClick={() => onView?.(item)}>{item.title}</button><span className="table-subtitle">{item.goalTitle}</span></td>
              <td><div className="person-cell"><span className="mini-avatar">{item.ownerName.split(' ').map(s => s[0]).slice(0, 2).join('')}</span><span>{item.ownerName}</span></div></td>
              <td><span className={item.isDelayed ? 'date-overdue' : 'date-text'}>{new Date(`${item.dueDate}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></td>
              <td><div className="progress-cell"><div className="progress-caption"><strong>{item.progress}%</strong></div><ProgressBar value={item.progress} /></div></td>
              <td><StatusPill status={item.displayStatus} /></td>
              {canEdit && <td>{!['Completed','Cancelled'].includes(item.status) && item.review !== 'Under Review' && <button className="text-button" onClick={() => onEdit?.(item)}>Edit</button>}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
