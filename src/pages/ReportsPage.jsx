import { useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import { request } from '../api.js';
export default function ReportsPage({ data, onSave }) {
  const [kind, setKind] = useState('Strategic plan'),
    [report, setReport] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function show(id) {
    const snapshot = await request('/reports/' + id);
    setReport({ ...snapshot, id });
  }
  async function generate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await onSave('/reports', 'POST', { kind });
      await show(result.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-content">
      <h1>Reports</h1>
      <form className="panel work-panel report-controls" onSubmit={generate}>
        <label className="field">
          <span>Report type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {['Strategic plan', 'Initiatives', 'KPIs'].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <button disabled={busy} className="button primary">
          Generate report
        </button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <section className="panel report-history">
        <div className="section-heading">
          <h2>Saved reports</h2>
        </div>
        <DataTable
          columns={['Type', 'Generated', '']}
          rows={data.reports.map((r) => [
            r.kind,
            new Date(r.createdAt).toLocaleString(),
            <button
              className="text-button"
              onClick={() => show(r.id).catch((err) => setError(err.message))}
            >
              View report
            </button>,
          ])}
        />
      </section>
      {report && (
        <article className="panel work-panel printable-report">
          <div className="section-heading">
            <div>
              <h2>{report.kind} report</h2>
              <p>
                {report.preparedBy} · {new Date(report.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="row-actions">
              <button className="button secondary" onClick={() => window.print()}>
                Print / save PDF
              </button>
              <a className="button secondary" href={'/api/reports/' + report.id + '/excel'}>
                Download Excel
              </a>
            </div>
          </div>
          {report.sections.map((s) => (
            <section key={s.name}>
              <h3>{s.name}</h3>
              {report.unavailable.includes(s.name) ? (
                <p>Data unavailable.</p>
              ) : (
                <DataTable columns={s.columns} rows={s.rows} />
              )}
            </section>
          ))}
        </article>
      )}
    </div>
  );
}
