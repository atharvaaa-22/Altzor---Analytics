import type React from 'react';

interface ConfidenceBadgeProps {
  score: number;
}

export function ConfidenceBadge({ score }: ConfidenceBadgeProps): React.JSX.Element {
  const percentage = Math.round(score * 100);

  let color = '#10B981'; // green
  let label = 'High Confidence';

  if (score < 0.5) {
    color = '#EF4444'; // red
    label = '⚠ Low Confidence';
  } else if (score < 0.75) {
    color = '#F59E0B'; // amber
    label = 'Medium Confidence';
  }

  return (
    <div className="confidence-badge" style={{ borderColor: color }}>
      <div className="confidence-bar" style={{ width: `${percentage}%`, backgroundColor: color }} />
      <span className="confidence-text" style={{ color }}>
        {label} ({percentage}%)
      </span>
    </div>
  );
}
