export default function DataTable({ columns, rows, empty = 'No records available.' }) {
  if (!rows.length) return <p className="empty-state">{empty}</p>;
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((value, j) => (
                <td key={j}>{value ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
