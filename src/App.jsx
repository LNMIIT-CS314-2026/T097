import { useCallback, useEffect, useState } from 'react';
import { request } from './api.js';
import Sidebar, { homePage } from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import Modal from './components/Modal.jsx';
import InitiativeForm from './components/InitiativeForm.jsx';
import InitiativeDetails from './components/InitiativeDetails.jsx';
import InitiativeTable from './components/InitiativeTable.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import InitiativesPage from './pages/InitiativesPage.jsx';
import ProgressPage from './pages/ProgressPage.jsx';
import RecordsPage from './pages/RecordsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import OperationsPage from './pages/OperationsPage.jsx';

function SignIn({ onLogin }) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    try {
      await onLogin(values);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="signin">
      <form className="signin-card panel" onSubmit={submit}>
        <div className="signin-brand">stratwise</div>
        <h1>Strategic Plan Monitor</h1>
        <p>Sign in to your institutional workspace.</p>
        <label className="field">
          <span>Username</span>
          <input name="username" required autoFocus autoComplete="username" />
        </label>
        <label className="field">
          <span>Password</span>
          <input name="password" required type="password" autoComplete="current-password" />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy} className="button primary">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

export default function App() {
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [form, setForm] = useState(undefined),
    [detail, setDetail] = useState(null),
    [goal, setGoal] = useState(null);
  const reset = useCallback(() => {
    setData(null);
    setPage('');
    setForm(undefined);
    setDetail(null);
    setGoal(null);
    setNotice('');
    setError('');
  }, []);
  const load = useCallback(async () => {
    const result = await request('/bootstrap');
    setData(result);
    setPage((p) => p || homePage(result.actor.role));
    setError('');
  }, []);
  useEffect(() => {
    window.addEventListener('session-ended', reset);
    load()
      .catch((err) => {
        if (err.status !== 401) setError(err.message);
      })
      .finally(() => setLoading(false));
    return () => window.removeEventListener('session-ended', reset);
  }, [load, reset]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(t);
  }, [notice]);
  async function save(path, method, body) {
    const result = await request(path, method, body);
    try {
      await load();
      setNotice('Changes saved.');
    } catch (err) {
      if (err.status !== 401) setError('Saved. Refresh to load the latest data.');
    }
    return result;
  }
  async function refresh() {
    try {
      await load();
    } catch (err) {
      if (err.status !== 401) setError(err.message);
    }
  }
  if (loading) return <div className="loading-state">Opening workspace…</div>;
  if (!data && error)
    return (
      <div className="error-state">
        <p role="alert">{error}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  if (!data)
    return (
      <SignIn
        onLogin={async (b) => {
          await request('/login', 'POST', b);
          await load();
        }}
      />
    );
  function navigate(id) {
    setPage(id);
    setForm(undefined);
    setDetail(null);
    setGoal(null);
    setError('');
  }
  let content;
  if (page === 'overview')
    content = <DashboardPage data={data} onViewInitiative={setDetail} onGoal={setGoal} />;
  else if (page === 'initiatives')
    content = (
      <InitiativesPage data={data} onNew={() => setForm(null)} onEdit={setForm} onView={setDetail} />
    );
  else if (page === 'progress') content = <ProgressPage data={data} onSave={save} />;
  else if (page === 'reports') content = <ReportsPage data={data} onSave={save} />;
  else if (['goals', 'milestones', 'kpis', 'risks', 'departments', 'users'].includes(page))
    content = <RecordsPage key={page} page={page} data={data} onSave={save} onGoal={setGoal} />;
  else content = <OperationsPage key={page} page={page} data={data} onSave={save} />;
  return (
    <div className="app-shell">
      <Sidebar actor={data.actor} page={page} onNavigate={navigate} />
      <main className="main-area">
        <Topbar
          page={page}
          onRefresh={refresh}
          onLogout={async () => {
            try {
              await request('/logout', 'POST');
              reset();
            } catch (err) {
              setError(err.message);
            }
          }}
        />
        <section className="page-wrap">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {content}
        </section>
      </main>
      {form !== undefined && (
        <InitiativeForm
          initiative={form}
          goals={data.goals}
          owners={data.users}
          onClose={() => setForm(undefined)}
          onSave={(b) => save('/initiatives' + (form ? '/' + form.id : ''), form ? 'PATCH' : 'POST', b)}
        />
      )}
      {goal && !detail && (
        <Modal
          title={goal.title}
          subtitle={goal.status + ' · Target ' + goal.dueDate}
          onClose={() => setGoal(null)}
          wide
        >
          <div className="details-body">
            <p>{goal.description}</p>
            <h3>Linked initiatives</h3>
            <InitiativeTable
              initiatives={data.initiatives.filter((i) => i.goalId === goal.id)}
              onView={setDetail}
            />
          </div>
        </Modal>
      )}
      {detail && (
        <InitiativeDetails
          initiative={data.initiatives.find((i) => i.id === detail.id) || detail}
          data={data}
          onClose={() => setDetail(null)}
          onSubmitReview={() => save('/initiatives/' + detail.id + '/submit', 'POST', {})}
        />
      )}
      {notice && (
        <div className="toast-message" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
