import { useState } from 'react';
import Modal from './Modal.jsx';

export function Field({ field, value, onChange }) {
  const { name, label, type = 'text', options, required = true, ...rest } = field;
  const common = {
    name,
    'aria-label': label,
    value: value ?? '',
    required,
    onChange: (e) => onChange(name, e.target.value),
    ...rest,
  };
  return (
    <label className={'field ' + (type === 'textarea' ? 'full-field' : '')}>
      <span>{label}</span>
      {options ? (
        <select {...common}>
          <option value="">{required ? 'Select…' : 'None'}</option>
          {options.map((opt) => {
            const [v, l] = Array.isArray(opt) ? opt : [opt, opt];
            return (
              <option key={v} value={v}>
                {l}
              </option>
            );
          })}
        </select>
      ) : type === 'textarea' ? (
        <textarea rows="3" {...common} />
      ) : type === 'checkbox' ? (
        <input
          type="checkbox"
          name={name}
          checked={Boolean(value)}
          onChange={(e) => onChange(name, e.target.checked)}
        />
      ) : (
        <input type={type} {...common} />
      )}
    </label>
  );
}
export default function RecordForm({ title, fields, initial, onClose, onSave }) {
  const [values, setValues] = useState(initial),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(values);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={title} onClose={onClose} wide>
      <form className="modal-form" onSubmit={submit}>
        <div className="form-grid">
          {fields.map((field) => (
            <Field
              key={field.name}
              field={field}
              value={values[field.name]}
              onChange={(name, val) => setValues((v) => ({ ...v, [name]: val }))}
            />
          ))}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
