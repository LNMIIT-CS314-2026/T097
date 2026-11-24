import { useState } from 'react';
import { Field } from '../components/RecordForm.jsx';

function ProgressForm({ initiative, milestones, onSave }) {
  const [draft, setDraft] = useState({
    progress: initiative.progress,
    status: initiative.status,
    note: '',
    milestoneId: '',
  });
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const change = (name, value) =>
    setDraft((old) => {
      const next = { ...old, [name]: value };
      if (name === 'milestoneId') {
        const m = milestones.find((m) => m.id === Number(value));
        next.milestoneProgress = m?.progress;
        next.milestoneStatus = m?.status;
      }
      return next;
    });
  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { progress, status, note, milestoneId, milestoneProgress, milestoneStatus } = draft;
      await onSave('/initiatives/' + initiative.id + '/progress', 'POST', {
        progress,
        status,
        note,
        ...(milestoneId
          ? { milestone: { id: milestoneId, progress: milestoneProgress, status: milestoneStatus } }
          : {}),
      });
      setDraft((v) => ({ ...v, note: '', milestoneId: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const fields = [
    { name: 'progress', label: 'Progress (%)', type: 'number', min: 0, max: 100 },
    {
      name: 'status',
      label: 'Initiative status',
      options: ['Planned', 'In Progress', 'Completed', ...(initiative.isDelayed ? ['Cancelled'] : [])],
    },
    { name: 'note', label: 'Progress note', type: 'textarea', required: false },
    {
      name: 'milestoneId',
      label: 'Update a milestone with this submission',
      required: false,
      options: milestones.map((m) => [m.id, m.title]),
    },
    ...(draft.milestoneId
      ? [
          {
            name: 'milestoneProgress',
            label: 'Milestone completion (%)',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            name: 'milestoneStatus',
            label: 'Milestone status',
            options: ['Not Started', 'In Progress', 'Completed'],
          },
        ]
      : []),
  ];
  return (
    <form className="progress-form" onSubmit={save}>
      <div className="form-grid">
        {fields.map((f) => (
          <Field key={f.name} field={f} value={draft[f.name]} onChange={change} />
        ))}
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="form-footer">
        <button className="button primary" disabled={busy}>
          Save progress update
        </button>
      </div>
    </form>
  );
}
export default function ProgressPage({ data, onSave }) {
  const open = data.initiatives.filter((i) => !['Completed', 'Cancelled'].includes(i.status));
  const [id, setId] = useState('');
  const selected = open.find((i) => i.id === Number(id)) || open[0];
  return (
    <div className="page-content">
      <h1>My progress</h1>
      <section className="panel work-panel">
        {selected ? (
          <>
            <label className="field">
              <span>Assigned initiative</span>
              <select value={selected.id} onChange={(e) => setId(e.target.value)}>
                {open.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}
                  </option>
                ))}
              </select>
            </label>
            <p>
              {selected.goalTitle} · Due {selected.dueDate} · {selected.review}
            </p>
            <ProgressForm
              key={[selected.id, selected.status, selected.progress].join('/')}
              initiative={selected}
              milestones={data.milestones.filter(
                (m) => m.initiativeId === selected.id && !['Completed', 'Cancelled'].includes(m.status),
              )}
              onSave={onSave}
            />
          </>
        ) : (
          <p>No open initiatives assigned.</p>
        )}
      </section>
    </div>
  );
}
