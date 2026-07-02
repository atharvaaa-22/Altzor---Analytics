import { callAi } from './aiClient.js';

export interface NarrativeSummary {
  summary: string;
  confidence: number;
  keyFindings: string[];
}

export async function generateNarrative(
  question: string,
  sql: string,
  results: Record<string, unknown>[],
  columnTypes: Array<{ name: string; dataType: string }>,
): Promise<NarrativeSummary> {
  const sampleRows = results.slice(0, 50);
  const rowCount = results.length;

  const systemPrompt = `You are a data insights analyst. Given a question, the SQL query used, and the result data, generate a concise narrative summary.

Rules:
1. Write 1-3 sentences highlighting key trends, patterns, and anomalies.
2. Include specific numbers and percentages when relevant.
3. Flag any surprising findings.
4. Provide a confidence score (0.0 to 1.0) based on data completeness and query accuracy.
5. List 1-3 key findings as bullet points.

Respond ONLY with JSON:
{
  "summary": "Your narrative summary here",
  "confidence": 0.85,
  "key_findings": ["Finding 1", "Finding 2"]
}`;

  const message = `Question: ${question}

SQL: ${sql}

Result Info:
- Total rows: ${rowCount}
- Columns: ${columnTypes.map((c) => `${c.name} (${c.dataType})`).join(', ')}
- Sample data (first ${sampleRows.length} rows):
${JSON.stringify(sampleRows, null, 2)}`;

  const response = await callAi(systemPrompt, [{ role: 'user', content: message }]);

  try {
    let jsonStr = response.content.trim();
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1]!.trim();

    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    return {
      summary: (parsed['summary'] as string) ?? 'No summary available.',
      confidence: (parsed['confidence'] as number) ?? 0.5,
      keyFindings: (parsed['key_findings'] as string[]) ?? [],
    };
  } catch {
    return {
      summary: response.content.slice(0, 500),
      confidence: 0.3,
      keyFindings: [],
    };
  }
}
