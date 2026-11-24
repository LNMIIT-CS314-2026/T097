import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import InitiativeForm from './components/InitiativeForm.jsx';
import InitiativeDetails from './components/InitiativeDetails.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import InitiativesPage from './pages/InitiativesPage.jsx';
import ProgressPage from './pages/ProgressPage.jsx';
import KpiPage from './pages/KpiPage.jsx';

export default function App() {
  const [role, setRole] = useState('management');
  const [page, setPage] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [formInitiative, setFormInitiative] = useState(undefined);
  const [details, setDetails] = useState(null);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await api.bootstrap();
      setData(response);
    } catch (err) {
      setError(err.message || 'The API server is not available.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const showToast = message => setToast(message);
  const handleRoleChange = nextRole => {
    setRole(nextRole);
    setPage('overview');
    setDetails(null);
  };
  const navigate = pageId => { setPage(pageId); setDetails(null); };

  async function handleSaveInitiative(body) {
    const response = formInitiative?.id
      ? await api.updateInitiative(formInitiative.id, body, role)
      : await api.createInitiative(body, role);
    setFormInitiative(undefined);
    await loadData({ silent: true });
    showToast(response.message || 'Initiative saved.');
  }

  async function handleProgressUpdate(id, body) {
    const response = await api.updateProgress(id, body, role);
    await loadData({ silent: true });
    showToast(response.message || 'Progress updated.');
  }

  async function handleMilestoneUpdate(id, body) {
    const response = await api.updateMilestone(id, body, role);
    await loadData({ silent: true });
    showToast(response.message || 'Milestone updated.');
  }

  async function handleReset() {
    const confirmed = window.confirm('Reset the central database to the original demonstration records? Your prototype changes will be removed.');
    if (!confirmed) return;
    setRefreshing(true);
    try {
      const response = await api.reset();
      await loadData({ silent: true });
      showToast(response.message || 'Demo data reset.');
    } catch (err) {
      showToast(err.message || 'Could not reset data.');
    } finally {
      setRefreshing(false);
    }
  }

  const pageContent = useMemo(() => {
    if (!data) return null;
    if (page === 'initiatives') return <InitiativesPage data={data} role={role} onNew={() => setFormInitiative(null)} onEdit={item => setFormInitiative(item)} onView={setDetails} />;
    if (page === 'progress') return <ProgressPage data={data} onSubmit={handleProgressUpdate} onMilestoneUpdate={handleMilestoneUpdate} />;
    if (page === 'kpis') return <KpiPage data={data} />;
    return <DashboardPage data={data} role={role} onNavigate={navigate} onViewInitiative={setDetails} />;
  }, [data, role, page]);

  return <div className="app-shell">
    <Sidebar role={role} page={page} onNavigate={navigate} data={data} />
    <main className="main-area">
      <Topbar page={page} role={role} onRoleChange={handleRoleChange} onReset={handleReset} refreshing={refreshing} />
      <div className="environment-banner"><span className="banner-icon">i</span><span><strong>Prototype role preview:</strong> role switching is for demonstration only. There is no real login/authentication in this build.</span><span className="banner-right">API connected to server-side database</span></div>
      {loading ? <div className="loading-state"><div className="loading-spinner"/><strong>Connecting to Strategic Plan Database…</strong><span>Loading goals, initiatives, milestones and KPIs from the API.</span></div> : error ? <div className="error-state"><div className="error-mark">!</div><h2>Could not load the prototype</h2><p>{error}</p><p className="muted">Start the application with <code>npm run dev</code> from the project folder.</p><button className="button primary" onClick={() => loadData()}>Try again</button></div> : <section className="page-wrap">{pageContent}</section>}
      <footer className="app-footer"><span>Strategic Plan Monitoring Dashboard <b>·</b> Team T097</span><span>CS314 Software Development Lab <b>·</b> React + Express + SQLite</span></footer>
    </main>
    {formInitiative !== undefined && data && <InitiativeForm initiative={formInitiative || null} goals={data.goals} owners={data.users.filter(user => user.role === 'owner')} onClose={() => setFormInitiative(undefined)} onSave={handleSaveInitiative} />}
    {details && data && <InitiativeDetails initiative={details} milestones={data.milestones} onClose={() => setDetails(null)} />}
    {toast && <div className="toast-message" role="status"><span>✓</span>{toast}</div>}
  </div>;
}
