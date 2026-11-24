import { useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import { labels } from '../components/Sidebar.jsx';
export default function OperationsPage({ page, data, onSave }) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function act(path, method, body) {
    setBusy(true);
    setError('');
    try {
      await onSave(path, method, body);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  let content;
  if (page === 'settings')
    content = (
      <form
        className="work-panel"
        onSubmit={(e) => {
          e.preventDefault();
          act('/settings', 'PATCH', { reminderDays: new FormData(e.target).get('days') });
        }}
      >
        <label className="field">
          <span>Days before deadline to notify owners and department heads</span>
          <input
            name="days"
            type="number"
            required
            min="0"
            max="365"
            defaultValue={data.settings.reminderDays}
          />
        </label>
        <button className="button primary" disabled={busy}>
          Save reminder window
        </button>
      </form>
    );
  if (page === 'audit')
    content = (
      <DataTable
        columns={['When', 'Account', 'Action']}
        rows={data.audit.map((e) => [new Date(e.createdAt).toLocaleString(), e.actor, e.event])}
      />
    );
  if (page === 'notifications')
    content = (
      <DataTable
        columns={['Notification', 'Received', 'Status']}
        rows={data.notifications.map((n) => [
          n.message,
          new Date(n.createdAt).toLocaleString(),
          n.isRead ? (
            'Read'
          ) : (
            <button
              className="text-button"
              disabled={busy}
              onClick={() => act('/notifications/' + n.id + '/read', 'POST', {})}
            >
              Mark read
            </button>
          ),
        ])}
        empty="You have no notifications."
      />
    );
  if (page === 'reviews') {
    const rows = [];
    for (const kind of ['goals', 'initiatives'])
      for (const row of data[kind].filter((r) => r.review === 'Under Review')) {
        rows.push([
          row.title,
          kind === 'goals' ? 'Goal' : 'Initiative',
          row.description,
          row.dueDate,
          <div className="row-actions">
            {['approve', 'reject'].map((action) => (
              <button
                className="text-button"
                disabled={busy}
                key={action}
                onClick={() => act('/' + kind + '/' + row.id + '/decision', 'POST', { action })}
              >
                {action === 'approve' ? 'Approve' : 'Request revision'}
              </button>
            ))}
          </div>,
        ]);
      }
    content = (
      <DataTable
        columns={['Title', 'Type', 'Description', 'Due date', 'Decision']}
        rows={rows}
        empty="No goals or initiatives awaiting review."
      />
    );
  }
  return (
    <div className="page-content">
      <h1>{labels[page]}</h1>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <section className="panel">{content}</section>
    </div>
  );
}
