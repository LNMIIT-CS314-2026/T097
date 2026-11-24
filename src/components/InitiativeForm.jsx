import { useState } from 'react';
import Modal from './Modal.jsx';

export default function InitiativeForm({ initiative, goals, owners, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    title: initiative?.title || '',
    description: initiative?.description || '',
    goalId: String(initiative?.goalId || goals[0]?.id || ''),
    ownerId: String(initiative?.ownerId || owners[0]?.id || ''),
    startDate: initiative?.startDate || '2026-10-01',
    dueDate: initiative?.dueDate || '2027-02-28',
    progress: String(initiative?.progress ?? 0),
    status: initiative?.status || 'Not Started',
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!form.title.trim() || !form.goalId || !form.ownerId || !form.startDate || !form.dueDate) {
      setError('Complete all required fields before saving.'); return;
    }
    if (form.dueDate < form.startDate) { setError('Target date cannot be earlier than the start date.'); return; }
    if (!Number.isInteger(Number(form.progress)) || Number(form.progress) < 0 || Number(form.progress) > 100) {
      setError('Progress must be a whole number from 0 to 100.'); return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, goalId: Number(form.goalId), ownerId: Number(form.ownerId), progress: Number(form.progress) });
    } catch (err) { setError(err.message || 'Could not save this initiative.'); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={initiative ? 'Edit initiative' : 'Create initiative'} subtitle="UC-006 · Manage Strategic Initiative" onClose={onClose} wide>
      <form onSubmit={submit} className="modal-form">
        <div className="form-section-label">INITIATIVE DETAILS</div>
        <label className="field full-field"><span>Initiative title <b>*</b></span><input autoFocus maxLength={140} value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Faculty research workshop" /></label>
        <label className="field full-field"><span>Description</span><textarea rows="3" value={form.description} onChange={e => update('description', e.target.value)} placeholder="What will this initiative achieve?" /></label>
        <div className="form-grid">
          <label className="field"><span>Strategic goal <b>*</b></span><select value={form.goalId} onChange={e => update('goalId', e.target.value)}><option value="">Select goal</option>{goals.map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>
          <label className="field"><span>Initiative owner <b>*</b></span><select value={form.ownerId} onChange={e => update('ownerId', e.target.value)}><option value="">Select owner</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.fullName}</option>)}</select></label>
          <label className="field"><span>Start date <b>*</b></span><input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} /></label>
          <label className="field"><span>Target date <b>*</b></span><input type="date" value={form.dueDate} onChange={e => update('dueDate', e.target.value)} /></label>
          <label className="field"><span>Progress (%)</span><input type="number" min="0" max="100" step="1" value={form.progress} onChange={e => update('progress', e.target.value)} /></label>
          <label className="field"><span>Status</span><select value={form.status} onChange={e => update('status', e.target.value)}><option>Not Started</option><option>In Progress</option><option>Completed</option></select></label>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-actions"><span className="required-note">* Required fields</span><div><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving ? 'Saving…' : initiative ? 'Save changes' : 'Create initiative'}</button></div></div>
      </form>
    </Modal>
  );
}
