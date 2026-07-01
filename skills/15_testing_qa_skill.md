# Skill File 15 — Testing & Quality Assurance

## Overview
Implement the testing strategy: unit tests (Vitest) with ≥70% coverage on critical paths, integration tests for all API endpoints, Playwright E2E tests for core user journeys, and the AI evaluation framework for NL2SQL accuracy.

**BRD References:** NFR-MAINT-004–005, AI-EVAL-001–004

---

## 1. Vitest Configuration — `apps/api/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts', 'node_modules/'],
      thresholds: {
        // NFR-MAINT-004: ≥70% on critical paths
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    setupFiles: ['src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## 2. Test Setup — `apps/api/src/test/setup.ts`

```typescript
/**
 * Test setup — Mock external services, configure test database.
 */

import { beforeAll, afterAll, vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-that-is-32-chars-long!!';
process.env.DATABASE_URL = 'mysql://root:password@localhost:3306/ai_analytics_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.GOOGLE_GENAI_API_KEY = 'test-gemini-key';

// Mock Redis
vi.mock('../../config/redis.js', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    ping: vi.fn().mockResolvedValue('PONG'),
  },
}));

beforeAll(async () => {
  console.log('[Test] Setup complete');
});

afterAll(async () => {
  console.log('[Test] Teardown complete');
});
```

---

## 3. Auth Service Unit Tests — `apps/api/src/services/auth/auth.service.test.ts`

```typescript
/**
 * auth.service.test.ts — Unit tests for authentication logic.
 *
 * NFR-MAINT-004: ≥70% coverage on authentication critical path.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validatePasswordComplexity,
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
} from './auth.service.js';

describe('Auth Service', () => {
  describe('validatePasswordComplexity', () => {
    // REQ-AUTH-004: min 8 chars, uppercase, lowercase, number, special
    it('should accept valid password', () => {
      expect(validatePasswordComplexity('Test@1234')).toBe(true);
      expect(validatePasswordComplexity('Str0ng!Pass')).toBe(true);
    });

    it('should reject password without uppercase', () => {
      expect(validatePasswordComplexity('test@1234')).toBe(false);
    });

    it('should reject password without lowercase', () => {
      expect(validatePasswordComplexity('TEST@1234')).toBe(false);
    });

    it('should reject password without number', () => {
      expect(validatePasswordComplexity('Test@abcd')).toBe(false);
    });

    it('should reject password without special character', () => {
      expect(validatePasswordComplexity('Test12345')).toBe(false);
    });

    it('should reject password shorter than 8 characters', () => {
      expect(validatePasswordComplexity('Te@1')).toBe(false);
    });
  });

  describe('JWT Tokens', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'ANALYST' as const,
      organizationId: 'org-456',
    };

    it('should generate and verify access token', () => {
      const token = generateAccessToken(payload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should reject invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });

    it('should generate unique refresh tokens', () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(32);
    });
  });
});
```

---

## 4. SQL Validator Unit Tests — `apps/api/src/services/ai/sqlValidator.test.ts`

```typescript
/**
 * sqlValidator.test.ts — Unit tests for SQL validation pipeline.
 *
 * NFR-MAINT-004: ≥70% coverage on query pipeline.
 */

import { describe, it, expect } from 'vitest';
import { validateSql } from './sqlValidator.js';

describe('SQL Validator', () => {
  describe('Safety Checks', () => {
    it('should allow SELECT queries', () => {
      const result = validateSql('SELECT * FROM users LIMIT 10');
      expect(result.isValid).toBe(true);
    });

    it('should block INSERT statements', () => {
      const result = validateSql('INSERT INTO users VALUES (1, "test")');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('INSERT'));
    });

    it('should block DROP statements', () => {
      const result = validateSql('DROP TABLE users');
      expect(result.isValid).toBe(false);
    });

    it('should block DELETE statements', () => {
      const result = validateSql('DELETE FROM users WHERE id = 1');
      expect(result.isValid).toBe(false);
    });

    it('should block TRUNCATE', () => {
      const result = validateSql('TRUNCATE TABLE users');
      expect(result.isValid).toBe(false);
    });

    it('should block ALTER', () => {
      const result = validateSql('ALTER TABLE users ADD COLUMN age INT');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Injection Detection', () => {
    it('should detect SQL injection via semicolon', () => {
      const result = validateSql("SELECT * FROM users; DROP TABLE users");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Multiple SQL statements'));
    });

    it('should detect UNION-based injection', () => {
      const result = validateSql(
        "SELECT * FROM users UNION ALL SELECT * FROM information_schema.tables",
      );
      expect(result.isValid).toBe(false);
    });
  });

  describe('Performance Guardrails', () => {
    it('should auto-append LIMIT when missing', () => {
      const result = validateSql('SELECT * FROM users');
      expect(result.sanitizedSql).toContain('LIMIT 1000');
      expect(result.warnings).toContain(expect.stringContaining('LIMIT'));
    });

    it('should not modify queries that already have LIMIT', () => {
      const result = validateSql('SELECT * FROM users LIMIT 50');
      expect(result.sanitizedSql).not.toContain('LIMIT 1000');
    });

    it('should warn about SELECT *', () => {
      const result = validateSql('SELECT * FROM users LIMIT 10');
      expect(result.warnings).toContain(expect.stringContaining('SELECT *'));
    });
  });

  describe('Edge Cases', () => {
    it('should reject empty SQL', () => {
      const result = validateSql('');
      expect(result.isValid).toBe(false);
    });

    it('should handle whitespace-only SQL', () => {
      const result = validateSql('   ');
      expect(result.isValid).toBe(false);
    });

    it('should allow WITH (CTE) queries', () => {
      const result = validateSql(`
        WITH sales AS (SELECT * FROM orders LIMIT 100)
        SELECT * FROM sales LIMIT 50
      `);
      expect(result.isValid).toBe(true);
    });
  });
});
```

---

## 5. API Integration Tests — `apps/api/src/routes/auth.routes.test.ts`

```typescript
/**
 * auth.routes.test.ts — Integration tests for auth API endpoints.
 *
 * NFR-MAINT-005: Integration tests cover all API endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';

describe('Auth Routes', () => {
  describe('POST /api/auth/login', () => {
    it('should return 400 for missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'test' });

      expect(res.status).toBe(400);
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@test.com', password: 'wrong' });

      expect(res.status).toBe(401);
    });

    it('should return 200 with token for valid credentials', async () => {
      // Requires seeded user
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@acme.com', password: 'Admin@123456' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.role).toBe('SUPER_ADMIN');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return 401 without refresh token cookie', async () => {
      const res = await request(app).post('/api/auth/refresh');
      expect(res.status).toBe(401);
    });
  });

  describe('Protected Routes', () => {
    it('should return 401 without auth header', async () => {
      const res = await request(app).get('/api/conversations');
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });
  });
});
```

---

## 6. Playwright E2E Tests — `apps/web/e2e/query.spec.ts`

```typescript
/**
 * query.spec.ts — Playwright E2E tests for core query journey.
 *
 * NFR-MAINT-005: Playwright E2E tests cover core user journeys.
 */

import { test, expect } from '@playwright/test';

test.describe('Query Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@acme.com');
    await page.fill('[data-testid="password-input"]', 'Admin@123456');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/conversations');
  });

  test('should create a new conversation and ask a question', async ({ page }) => {
    // Create conversation
    await page.click('[data-testid="new-conversation-btn"]');
    await page.waitForSelector('[data-testid="chat-input"]');

    // Type question
    await page.fill('[data-testid="chat-input"]', 'Show me total revenue by month');
    await page.click('[data-testid="send-btn"]');

    // Wait for response
    await page.waitForSelector('[data-testid="sql-display"]', { timeout: 30000 });

    // Verify SQL is displayed
    const sqlBlock = await page.textContent('[data-testid="sql-display"]');
    expect(sqlBlock).toContain('SELECT');

    // Verify chart is rendered
    await page.waitForSelector('.recharts-wrapper', { timeout: 10000 });
  });

  test('should navigate to dashboards', async ({ page }) => {
    await page.click('[data-testid="nav-dashboards"]');
    await page.waitForURL('/dashboards');

    // Create new dashboard
    await page.click('[data-testid="create-dashboard-btn"]');
    await page.fill('[data-testid="dashboard-title-input"]', 'Revenue Dashboard');
    await page.click('[data-testid="create-dashboard-submit"]');

    // Verify dashboard created
    await page.waitForSelector('[data-testid="dashboard-grid"]');
  });

  test('should upload a file', async ({ page }) => {
    await page.click('[data-testid="nav-files"]');
    await page.waitForURL('/files');

    // Upload CSV
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('name,value\nAlice,100\nBob,200'),
    });

    // Verify upload
    await page.waitForSelector('[data-testid="file-list"]');
    const fileItem = await page.textContent('[data-testid="file-list"]');
    expect(fileItem).toContain('test.csv');
  });
});
```

---

## 7. AI Evaluation Framework — `apps/api/src/services/ai/evaluation.ts`

```typescript
/**
 * evaluation.ts — AI evaluation framework for NL2SQL accuracy.
 *
 * AI-EVAL-001: Robust evaluation framework.
 * AI-EVAL-002: Golden query datasets.
 * AI-EVAL-003: Automated testing on prompt/model/semantic changes.
 * AI-EVAL-004: Track SQL accuracy, result accuracy, confidence calibration.
 */

import { callAi } from './aiClient.js';
import { buildSystemPrompt, buildMessages, parseAiResponse } from './promptBuilder.js';
import { validateSql } from './sqlValidator.js';

// ─── Types ─────────────────────────────────────────────────────────
export interface GoldenQuery {
  id: string;
  question: string;              // Natural language input
  expectedSql: string;           // Expected SQL output
  expectedTables: string[];      // Expected tables used
  expectedRowCount?: number;     // Expected result count
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

export interface EvaluationResult {
  queryId: string;
  question: string;
  generatedSql: string;
  expectedSql: string;
  sqlMatch: boolean;             // Exact or semantic SQL match
  tablesMatch: boolean;          // Correct tables used
  validationPassed: boolean;     // Passed SQL validator
  confidenceScore: number;       // LLM's self-reported confidence
  executionTimeMs: number;
  error?: string;
}

export interface EvaluationReport {
  totalQueries: number;
  sqlAccuracy: number;           // % of SQL matches
  tableAccuracy: number;         // % of correct table usage
  validationPassRate: number;    // % passing validation
  avgConfidence: number;         // Average LLM confidence
  avgLatencyMs: number;          // Average response time
  resultsByDifficulty: Record<string, { total: number; correct: number }>;
  failures: EvaluationResult[];
  timestamp: string;
}

/**
 * Run evaluation against a golden query dataset.
 */
export async function runEvaluation(
  goldenQueries: GoldenQuery[],
  schema: unknown, // SchemaTable[]
  semanticLayer: unknown, // SemanticLayer
  dialect: string,
): Promise<EvaluationReport> {
  const results: EvaluationResult[] = [];
  const byDifficulty: Record<string, { total: number; correct: number }> = {};

  for (const query of goldenQueries) {
    const start = Date.now();

    try {
      // Generate SQL via AI
      const systemPrompt = buildSystemPrompt(
        dialect as 'POSTGRESQL',
        schema as never[],
        semanticLayer as never,
      );
      const messages = buildMessages([], query.question);
      const response = await callAi(systemPrompt, messages);
      const parsed = parseAiResponse(response.content);

      // Validate
      const validation = validateSql(parsed.sql);

      // Compare with expected
      const sqlMatch = normalizeSql(parsed.sql) === normalizeSql(query.expectedSql);
      const tablesMatch = query.expectedTables.every((t) =>
        parsed.tablesUsed.map((x) => x.toLowerCase()).includes(t.toLowerCase()),
      );

      results.push({
        queryId: query.id,
        question: query.question,
        generatedSql: parsed.sql,
        expectedSql: query.expectedSql,
        sqlMatch,
        tablesMatch,
        validationPassed: validation.isValid,
        confidenceScore: parsed.confidence,
        executionTimeMs: Date.now() - start,
      });
    } catch (error) {
      results.push({
        queryId: query.id,
        question: query.question,
        generatedSql: '',
        expectedSql: query.expectedSql,
        sqlMatch: false,
        tablesMatch: false,
        validationPassed: false,
        confidenceScore: 0,
        executionTimeMs: Date.now() - start,
        error: (error as Error).message,
      });
    }

    // Track by difficulty
    const diff = query.difficulty;
    if (!byDifficulty[diff]) byDifficulty[diff] = { total: 0, correct: 0 };
    byDifficulty[diff]!.total++;
    if (results[results.length - 1]!.sqlMatch) byDifficulty[diff]!.correct++;
  }

  // Compute report
  const sqlAccuracy = results.filter((r) => r.sqlMatch).length / results.length;
  const tableAccuracy = results.filter((r) => r.tablesMatch).length / results.length;
  const validationPassRate = results.filter((r) => r.validationPassed).length / results.length;
  const avgConfidence = results.reduce((s, r) => s + r.confidenceScore, 0) / results.length;
  const avgLatencyMs = results.reduce((s, r) => s + r.executionTimeMs, 0) / results.length;

  return {
    totalQueries: results.length,
    sqlAccuracy: Math.round(sqlAccuracy * 100),
    tableAccuracy: Math.round(tableAccuracy * 100),
    validationPassRate: Math.round(validationPassRate * 100),
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    avgLatencyMs: Math.round(avgLatencyMs),
    resultsByDifficulty: byDifficulty,
    failures: results.filter((r) => !r.sqlMatch),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Normalize SQL for comparison (remove whitespace, lowercase).
 */
function normalizeSql(sql: string): string {
  return sql
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/;\s*$/, '')
    .trim();
}
```

---

## 8. Test Scripts — `package.json` additions

```json
{
  "scripts": {
    "test": "turbo run test",
    "test:unit": "turbo run test -- --coverage",
    "test:integration": "turbo run test -- --include '**/*.integration.test.ts'",
    "test:e2e": "cd apps/web && npx playwright test",
    "test:eval": "tsx apps/api/src/scripts/runEvaluation.ts"
  }
}
```

---

## 9. Verification Checklist

| Step | Command | Expected |
|------|---------|----------|
| Unit tests pass | `npm run test:unit` | All green, coverage ≥70% |
| Auth tests pass | Run auth.service.test.ts | Password validation + JWT tested |
| SQL validator tests | Run sqlValidator.test.ts | Safety checks + guardrails tested |
| API integration tests | Run auth.routes.test.ts | Login/refresh/protected routes tested |
| E2E login flow | `npm run test:e2e` | Playwright passes query journey |
| E2E file upload | Playwright file test | CSV uploaded and visible |
| AI evaluation | `npm run test:eval` | Report with accuracy metrics |
| Coverage report | Check `coverage/index.html` | ≥70% on critical paths |

---

## Next Skill → `16_devops_deployment_skill.md`
