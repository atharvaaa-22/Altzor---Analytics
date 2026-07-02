export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedSql: string;
}

const DML_DDL_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER',
  'CREATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL',
  'MERGE', 'REPLACE', 'LOAD', 'COPY',
];

const INJECTION_PATTERNS = [
  /;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE)/i,
  /UNION\s+ALL\s+SELECT.*FROM\s+information_schema/i,
  /\/\*[\s\S]*?\*\//,
  /xp_cmdshell/i,
  /WAITFOR\s+DELAY/i,
  /BENCHMARK\s*\(/i,
  /SLEEP\s*\(/i,
  /INTO\s+OUTFILE/i,
  /LOAD_FILE\s*\(/i,
];

export function validateSql(sql: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let sanitized = sql.trim();

  if (!sanitized || sanitized.length === 0) {
    errors.push('Empty SQL query');
    return { isValid: false, errors, warnings, sanitizedSql: sanitized };
  }

  sanitized = sanitized.replace(/;\s*$/, '');

  if (sanitized.includes(';')) {
    errors.push('Multiple SQL statements are not allowed');
  }

  const upperSql = sanitized.toUpperCase().trim();
  for (const keyword of DML_DDL_KEYWORDS) {
    if (upperSql.startsWith(keyword + ' ') || upperSql.startsWith(keyword + '\n')) {
      errors.push(`${keyword} operations are not allowed. Only SELECT queries are permitted.`);
    }
  }

  const dangerousInBody = DML_DDL_KEYWORDS.filter((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(sanitized) && !upperSql.startsWith('SELECT') && !upperSql.startsWith('WITH');
  });

  if (dangerousInBody.length > 0 && upperSql.startsWith('SELECT')) {
    warnings.push(`Query contains potentially dangerous keywords: ${dangerousInBody.join(', ')}`);
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      errors.push('Potential SQL injection pattern detected');
      break;
    }
  }

  if (!(/\bLIMIT\b/i.test(sanitized)) && !(/\bTOP\b/i.test(sanitized))) {
    sanitized += ' LIMIT 1000';
    warnings.push('LIMIT 1000 automatically applied for performance safety');
  }

  if (/SELECT\s+\*/i.test(sanitized)) {
    warnings.push('SELECT * may return excessive columns. Consider specifying needed columns.');
  }

  if (/\bFROM\b/i.test(sanitized) && !/\bWHERE\b/i.test(sanitized) && !/\bLIMIT\s+\d/i.test(sanitized)) {
    warnings.push('No WHERE clause detected. Results may be very large.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedSql: sanitized,
  };
}
