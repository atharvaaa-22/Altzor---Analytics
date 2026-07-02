

interface NarrativeCardProps {
  narrative: {
    summary: string;
    confidence: number;
    keyFindings: string[];
  };
}

export function NarrativeCard({ narrative }: NarrativeCardProps) {
  return (
    <div className="narrative-card">
      <div className="narrative-icon">💡</div>
      <div className="narrative-content">
        <p className="narrative-summary">{narrative.summary}</p>
        {narrative.keyFindings.length > 0 && (
          <ul className="narrative-findings">
            {narrative.keyFindings.map((finding, i) => (
              <li key={i}>{finding}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
