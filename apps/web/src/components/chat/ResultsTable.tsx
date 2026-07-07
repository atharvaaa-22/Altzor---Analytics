import type React from 'react';

interface ResultsTableProps {
  data: Record<string, unknown>[];
  columns: Array<{ name: string; dataType: string }>;
}

export function ResultsTable({ data, columns }: ResultsTableProps): React.JSX.Element {
  return (
    <div className="results-table-container" style={{ overflowX: 'auto', marginTop: '16px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc' }}>
            {columns.map((col) => (
              <th key={col.name} style={{ padding: '8px' }}>
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
              {columns.map((col) => (
                <td key={col.name} style={{ padding: '8px' }}>
                  {String(row[col.name] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 10 && (
        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '8px' }}>
          Showing top 10 of {data.length} rows
        </div>
      )}
    </div>
  );
}
