const ACTIONS_HEADER = 'Ações';

export function DataTable({ headers, children }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} className={header === ACTIONS_HEADER ? 'cell-actions' : undefined}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Cell({ label, children }) {
  return (
    <td data-label={label} className={label === ACTIONS_HEADER ? 'cell-actions' : undefined}>
      {children}
    </td>
  );
}
