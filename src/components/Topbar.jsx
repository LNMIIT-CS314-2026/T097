import { labels } from './Sidebar.jsx';
export default function Topbar({ page, onRefresh, onLogout, busy }) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Institutional plan</span>
        <span>/</span>
        <strong>{labels[page]}</strong>
      </div>
      <div className="topbar-right">
        <button className="button secondary" onClick={onRefresh} disabled={busy}>
          Refresh
        </button>
        <button className="button secondary" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  );
}
