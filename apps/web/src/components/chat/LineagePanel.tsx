import { useState } from 'react';

interface LineagePanelProps {
  lineage: {
    tablesUsed?: string[];
    columnsUsed?: string[];
    filters?: string[];
    aggregations?: string[];
    rowsScanned?: number;
    rowsReturned?: number;
  };
}

export function LineagePanel({ lineage }: LineagePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lineage-panel">
      <button className="lineage-toggle" onClick={() => setOpen(!open)}>
        {open ? '▼' : '▶'} Data Lineage
      </button>
      {open && (
        <div className="lineage-details">
          {lineage.tablesUsed && lineage.tablesUsed.length > 0 && (
            <div className="lineage-section">
              <strong>Tables:</strong> {lineage.tablesUsed.join(', ')}
            </div>
          )}
          {lineage.columnsUsed && lineage.columnsUsed.length > 0 && (
            <div className="lineage-section">
              <strong>Columns:</strong> {lineage.columnsUsed.join(', ')}
            </div>
          )}
          {lineage.filters && lineage.filters.length > 0 && (
            <div className="lineage-section">
              <strong>Filters:</strong> {lineage.filters.join(' AND ')}
            </div>
          )}
          {lineage.aggregations && lineage.aggregations.length > 0 && (
            <div className="lineage-section">
              <strong>Aggregations:</strong> {lineage.aggregations.join(', ')}
            </div>
          )}
          <div className="lineage-section">
            <strong>Rows:</strong> {lineage.rowsScanned ?? '?'} scanned → {lineage.rowsReturned ?? '?'} returned
          </div>
        </div>
      )}
    </div>
  );
}
