import type React from 'react';
import { useState } from 'react';

interface SqlDisplayProps {
  sql: string;
}

export function SqlDisplay({ sql }: SqlDisplayProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isLong = sql.length > 200;
  const displaySql = expanded || !isLong ? sql : sql.slice(0, 200) + '...';

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="sql-display">
      <div className="sql-header">
        <span className="sql-label">Generated SQL</span>
        <div className="sql-actions">
          <button className="sql-copy-btn" onClick={() => void handleCopy()}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          {isLong && (
            <button className="sql-expand-btn" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          )}
        </div>
      </div>
      <pre className="sql-code">
        <code>{displaySql}</code>
      </pre>
    </div>
  );
}
