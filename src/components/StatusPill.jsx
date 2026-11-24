export default function StatusPill({ status }) {
  const key = String(status || 'Not Started').toLowerCase().replaceAll(' ', '-');
  return <span className={`status-pill ${key}`}>{status || 'Not Started'}</span>;
}
