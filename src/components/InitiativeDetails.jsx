import Modal from './Modal.jsx';
import StatusPill from './StatusPill.jsx';

export default function InitiativeDetails({ initiative, milestones, onClose }) {
  const rows = milestones.filter(m => m.initiativeId === initiative.id);
  return (
    <Modal title={initiative.title} subtitle={initiative.goalTitle} onClose={onClose} wide>
      <div className="details-body">
        <div className="detail-summary-row"><div><span className="detail-label">Current status</span><StatusPill status={initiative.displayStatus} /></div><div><span className="detail-label">Completion</span><strong className="detail-emphasis">{initiative.progress}%</strong></div><div><span className="detail-label">Target date</span><strong>{initiative.dueDate}</strong></div></div>
        <div className="detail-progress"><div className="progress-track"><div className="progress-fill" style={{ width: `${initiative.progress}%` }} /></div></div>
        <p className="detail-description">{initiative.description || 'No description has been added.'}</p>
        <div className="detail-meta-grid"><div><span className="detail-label">Responsible owner</span><strong>{initiative.ownerName}</strong></div><div><span className="detail-label">Start date</span><strong>{initiative.startDate}</strong></div><div><span className="detail-label">Strategic goal</span><strong>{initiative.goalTitle}</strong></div></div>
        <div className="section-heading in-modal"><div><h3>Milestones</h3><p>{rows.filter(m => m.status === 'Completed').length} of {rows.length} completed</p></div></div>
        {rows.length ? <div className="milestone-list">{rows.map(m => <div className="milestone-row" key={m.id}><span className={`milestone-check ${m.status === 'Completed' ? 'checked' : ''}`}>{m.status === 'Completed' ? '✓' : '·'}</span><div className="milestone-copy"><strong>{m.title}</strong><small>Target {m.dueDate}</small></div><StatusPill status={m.isDelayed ? 'Delayed' : m.status} /></div>)}</div> : <p className="muted">No milestones have been added.</p>}
      </div>
    </Modal>
  );
}
