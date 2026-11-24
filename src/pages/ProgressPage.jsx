import { useEffect, useMemo, useState } from 'react';
import StatusPill from '../components/StatusPill.jsx';

export default function ProgressPage({ data, onSubmit, onMilestoneUpdate }) {
  const assigned = useMemo(() => data.initiatives.filter(item => item.ownerId === 2), [data.initiatives]);
  const [selectedId, setSelectedId] = useState(String(assigned[0]?.id || ''));
  const selected = assigned.find(item => String(item.id) === selectedId) || assigned[0];
  const [progress, setProgress] = useState(String(selected?.progress ?? 0));
  const [status, setStatus] = useState(selected?.status || 'In Progress');
  const [note, setNote] = useState('');
  const [milestoneDrafts, setMilestoneDrafts] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProgress(String(selected?.progress ?? 0));
    setStatus(selected?.status || 'In Progress');
    setNote('');
  }, [selected?.id, selected?.progress, selected?.status]);

  const milestones = data.milestones.filter(m => m.initiativeId === selected?.id);
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!selected) { setError('No initiatives are currently assigned to this demo owner.'); return; }
    if (!Number.isInteger(Number(progress)) || Number(progress) < 0 || Number(progress) > 100) { setError('Progress must be a whole number from 0 to 100.'); return; }
    setSaving(true);
    try { await onSubmit(selected.id, { progress: Number(progress), status, note }); setNote(''); }
    catch (err) { setError(err.message || 'Could not update progress.'); }
    finally { setSaving(false); }
  }

  async function saveMilestone(milestone) {
    const value = milestoneDrafts[milestone.id] || milestone.status;
    try { await onMilestoneUpdate(milestone.id, { status: value }); setError(''); }
    catch (err) { setError(err.message || 'Could not update milestone.'); }
  }

  return <div className="page-content">
    <div className="page-intro-row"><div><div className="eyebrow">UC-009 · UPDATE INITIATIVE PROGRESS</div><h1>My progress updates</h1><p>Record the latest delivery status and milestone updates for your assigned initiatives.</p></div><div className="as-of-pill"><span className="pulse-dot" /> Updates are saved to the server</div></div>
    <div className="progress-workspace">
      <section className="panel assigned-panel"><div className="section-heading"><div><h2>Assigned to me</h2><p>Initiatives where Neha Sharma is the owner</p></div><span className="count-badge">{assigned.length}</span></div>
        <div className="assigned-list">{assigned.map(item => <button key={item.id} className={`assigned-item ${selected?.id === item.id ? 'selected' : ''}`} onClick={() => setSelectedId(String(item.id))}><div className="assigned-item-top"><span className="assigned-icon">{item.isDelayed ? '!' : '◌'}</span><StatusPill status={item.displayStatus} /></div><strong>{item.title}</strong><small>{item.goalTitle}</small><div className="assigned-progress"><div className="progress-track"><div className="progress-fill" style={{ width: `${item.progress}%` }} /></div><span>{item.progress}%</span></div><span className="assigned-due">Target date · {item.dueDate}</span></button>)}</div>
      </section>
      <div className="progress-main-column">
        <section className="panel progress-update-panel"><div className="section-heading"><div><h2>Update initiative</h2><p>Progress and status are shared with management</p></div><span className="form-step-tag">01 / 02</span></div>
          {selected ? <form className="progress-form" onSubmit={submit}><div className="selected-initiative-banner"><div className="selected-initiative-icon">↗</div><div><strong>{selected.title}</strong><small>{selected.goalTitle} · Target {selected.dueDate}</small></div></div>
            <label className="field"><span>Progress complete (%)</span><div className="range-value-row"><input type="range" min="0" max="100" step="5" value={progress} onChange={e => setProgress(e.target.value)} /><strong>{progress}%</strong></div></label>
            <label className="field"><span>Initiative status</span><select value={status} onChange={e => setStatus(e.target.value)}><option>Not Started</option><option>In Progress</option><option>Completed</option></select></label>
            <label className="field"><span>Progress note</span><textarea rows="3" value={note} onChange={e => setNote(e.target.value)} placeholder="Summarize what changed since the last update…" /></label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <div className="form-footer"><span className="muted tiny">Saved to progress history</span><button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Save progress update'}</button></div>
          </form> : <div className="empty-state"><strong>No assigned initiatives</strong></div>}
        </section>
        <section className="panel milestone-panel"><div className="section-heading"><div><h2>Milestone checklist</h2><p>Update individual milestone status</p></div><span className="form-step-tag">02 / 02</span></div>
          {milestones.length ? <div className="milestone-list">{milestones.map(m => <div className="milestone-row" key={m.id}><span className={`milestone-check ${m.status === 'Completed' ? 'checked' : ''}`}>{m.status === 'Completed' ? '✓' : '·'}</span><div className="milestone-copy"><strong>{m.title}</strong><small>Target {m.dueDate}{m.isDelayed ? ' · Past due' : ''}</small></div><select aria-label={`Status for ${m.title}`} value={milestoneDrafts[m.id] || m.status} onChange={e => setMilestoneDrafts(prev => ({ ...prev, [m.id]: e.target.value }))}><option>Not Started</option><option>In Progress</option><option>Completed</option></select><button className="tiny-save" onClick={() => saveMilestone(m)} disabled={!milestoneDrafts[m.id] || milestoneDrafts[m.id] === m.status}>Save</button></div>)}</div> : <div className="empty-state"><strong>No milestones found</strong><p>Select an assigned initiative with milestones.</p></div>}
        </section>
      </div>
    </div>
    <div className="note-row"><span>ⓘ</span><p>The API validates progress values and prevents the demo owner from updating initiatives assigned to a different owner. In this prototype, the role selector is a demonstration mechanism, not real authentication.</p></div>
  </div>;
}
