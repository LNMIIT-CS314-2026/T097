import Modal from './Modal.jsx';
import StatusPill from './StatusPill.jsx';
import { useState } from 'react';
import DataTable from './DataTable.jsx';

export default function InitiativeDetails({ initiative, data, onClose, onSubmitReview }) {
  const [error, setError] = useState('');
  const rows = data.milestones.filter((m) => m.initiativeId === initiative.id);
  const kpis = data.kpis.filter((k) => k.initiativeId === initiative.id);
  return (
    <Modal title={initiative.title} subtitle={initiative.goalTitle} onClose={onClose} wide>
      <div className="details-body">
        <div className="detail-summary-row">
          <div>
            <span className="detail-label">Current status</span>
            <StatusPill status={initiative.displayStatus} />
          </div>
          <div>
            <span className="detail-label">Completion</span>
            <strong className="detail-emphasis">{initiative.progress}%</strong>
          </div>
          <div>
            <span className="detail-label">Target date</span>
            <strong>{initiative.dueDate}</strong>
          </div>
        </div>
        <div className="detail-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${initiative.progress}%` }} />
          </div>
        </div>
        <p className="detail-description">
          {initiative.description || 'No description has been added.'}
        </p>
        <p>Review · {initiative.review}</p>
        {data.actor.role === 'planner' && ['Draft', 'Revision Required'].includes(initiative.review) && (
          <button
            className="button secondary"
            onClick={() => onSubmitReview().catch((err) => setError(err.message))}
          >
            Submit for review
          </button>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="detail-meta-grid">
          <div>
            <span className="detail-label">Responsible owner</span>
            <strong>{initiative.ownerName}</strong>
          </div>
          <div>
            <span className="detail-label">Start date</span>
            <strong>{initiative.startDate}</strong>
          </div>
          <div>
            <span className="detail-label">Strategic goal</span>
            <strong>{initiative.goalTitle}</strong>
          </div>
        </div>
        <div className="section-heading in-modal">
          <div>
            <h3>Milestones</h3>
            <p>
              {rows.filter((m) => m.status === 'Completed').length} of {rows.length} completed
            </p>
          </div>
        </div>
        {data.unavailable.includes('Milestones') ? (
          <p>Milestone data unavailable.</p>
        ) : rows.length ? (
          <div className="milestone-list">
            {rows.map((m) => (
              <div className="milestone-row" key={m.id}>
                <span className={`milestone-check ${m.status === 'Completed' ? 'checked' : ''}`}>
                  {m.status === 'Completed' ? '✓' : '·'}
                </span>
                <div className="milestone-copy">
                  <strong>{m.title}</strong>
                  <small>
                    Target {m.dueDate} · {m.progress}% · {m.required ? 'Required' : 'Optional'}
                  </small>
                </div>
                <StatusPill status={m.isDelayed ? 'Delayed' : m.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No milestones have been added.</p>
        )}
        <h3>Linked KPIs</h3>
        {data.unavailable.includes('KPIs') ? (
          <p>KPI data unavailable.</p>
        ) : (
          <DataTable
            columns={['KPI', 'Current', 'Target', 'Unit', 'Status']}
            rows={kpis.map((k) => [k.name, k.currentValue, k.targetValue, k.unit, k.status])}
          />
        )}
        <h3>Recent progress updates</h3>
        <DataTable
          columns={['When', 'Progress', 'Note']}
          rows={data.progressUpdates
            .filter((item) => item.initiativeId === initiative.id)
            .map((item) => [new Date(item.createdAt).toLocaleString(), item.progress + '%', item.note])}
          empty="No recent updates for this initiative."
        />
      </div>
    </Modal>
  );
}
