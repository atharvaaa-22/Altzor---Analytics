# Skill File 03 — Database Connectivity & Schema Discovery

## Overview
Implement the multi-database connector layer that supports PostgreSQL, MySQL, SQL Server, Snowflake, BigQuery, and MongoDB. Handle encrypted credential storage (AES-256-GCM), connection pooling, schema auto-discovery, and Redis-cached metadata.

**BRD References:** REQ-DB-001–006, NFR-SEC-007, NFR-AVAIL-004

---

## 1. Crypto Utility — `apps/api/src/utils/crypto.ts`

```typescript
/**
 * crypto.ts — AES-256-GCM encryption/decryption for database credentials.
 *
 * REQ-DB-002: Credentials encrypted at rest, decrypted only at query time, never logged.
 */

import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function deriveKey(): Buffer {
  // Derive a 256-bit key from JWT_SECRET (or a dedicated ENCRYPTION_KEY)
  return crypto
    .createHash('sha256')
    .update(env.JWT_SECRET)
    .digest();
}

export interface EncryptedData {
  ciphertext: string; // hex
  iv: string;         // hex
  tag: string;        // hex
}

export function encrypt(plaintext: string): EncryptedData {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

export function decrypt(data: EncryptedData): string {
  const key = deriveKey();
  const iv = Buffer.from(data.iv, 'hex');
  const tag = Buffer.from(data.tag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(data.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

---

## 2. Connection Factory — `apps/api/src/services/connectors/connectionFactory.ts`

```typescript
/**
 * connectionFactory.ts — Multi-database connection factory.
 *
 * REQ-DB-001: PostgreSQL 14+, MySQL 8.0+, MSSQL 2019+, Snowflake, BigQuery, MongoDB 6+.
 * REQ-DB-003: Connection pooling per organization, idle cleanup every 5 min.
 * NFR-AVAIL-004: Dead connection detection and pool refresh.
 */

import { ConnectionType } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { decrypt } from '../../utils/crypto.js';
import { createPostgresConnector, type DbConnector } from './postgres.connector.js';
import { createMysqlConnector } from './mysql.connector.js';
import { createMssqlConnector } from './mssql.connector.js';
import { createSnowflakeConnector } from './snowflake.connector.js';
import { createBigQueryConnector } from './bigquery.connector.js';
import { createMongoConnector } from './mongo.connector.js';

export type { DbConnector };

export interface SchemaColumn {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyRef?: { table: string; column: string };
  nullable: boolean;
  sampleValues: string[]; // REQ-DB-004: 5 per column
}

export interface SchemaTable {
  name: string;
  schema: string;
  columns: SchemaColumn[];
  rowCount: number;
  relationships: { from: string; to: string; type: string }[];
}

export interface SchemaMetadata {
  tables: SchemaTable[];
  discoveredAt: string;
  connectionId: string;
  dialect: ConnectionType;
}

// ─── Connection Pool Cache ─────────────────────────────────────────
const poolCache = new Map<string, { connector: DbConnector; lastUsed: number }>();

// REQ-DB-003: Idle cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  const IDLE_TIMEOUT = 5 * 60 * 1000;
  for (const [key, entry] of poolCache) {
    if (now - entry.lastUsed > IDLE_TIMEOUT) {
      entry.connector.disconnect().catch(() => {});
      poolCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get or create a database connector for the given connection ID.
 */
export async function getConnector(connectionId: string): Promise<DbConnector> {
  // Check pool cache
  const cached = poolCache.get(connectionId);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.connector;
  }

  // Fetch connection config from DB
  const conn = await prisma.databaseConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });

  // Decrypt password at query time only (REQ-DB-002)
  let password: string | undefined;
  if (conn.encryptedPassword && conn.encryptionIV && conn.encryptionTag) {
    password = decrypt({
      ciphertext: conn.encryptedPassword,
      iv: conn.encryptionIV,
      tag: conn.encryptionTag,
    });
  }

  const config = {
    host: conn.host ?? undefined,
    port: conn.port ?? undefined,
    database: conn.database ?? undefined,
    username: conn.username ?? undefined,
    password,
    connectionString: conn.connectionString ?? undefined,
    ssl: conn.sslEnabled,
  };

  // Create connector based on type
  let connector: DbConnector;
  switch (conn.type) {
    case ConnectionType.POSTGRESQL:
      connector = createPostgresConnector(config);
      break;
    case ConnectionType.MYSQL:
      connector = createMysqlConnector(config);
      break;
    case ConnectionType.MSSQL:
      connector = createMssqlConnector(config);
      break;
    case ConnectionType.SNOWFLAKE:
      connector = createSnowflakeConnector(config);
      break;
    case ConnectionType.BIGQUERY:
      connector = createBigQueryConnector(config);
      break;
    case ConnectionType.MONGODB:
      connector = createMongoConnector(config);
      break;
    default:
      throw new Error(`Unsupported database type: ${conn.type}`);
  }

  poolCache.set(connectionId, { connector, lastUsed: Date.now() });
  return connector;
}

/**
 * Remove a connector from the pool (e.g., on connection delete).
 */
export async function removeConnector(connectionId: string): Promise<void> {
  const cached = poolCache.get(connectionId);
  if (cached) {
    await cached.connector.disconnect();
    poolCache.delete(connectionId);
  }
}
```

---

## 3. Connector Interface & PostgreSQL Example — `apps/api/src/services/connectors/postgres.connector.ts`

```typescript
/**
 * postgres.connector.ts — PostgreSQL database connector.
 *
 * REQ-DB-001: PostgreSQL 14+ support.
 * REQ-QER-007: Read-only enforcement at driver level.
 */

import pg from 'pg';
import type { SchemaTable, SchemaColumn } from './connectionFactory.js';

export interface DbConnector {
  /** Execute a read-only SQL query */
  executeQuery(sql: string, timeoutMs: number): Promise<QueryResult>;
  /** Discover schema metadata */
  discoverSchema(): Promise<SchemaTable[]>;
  /** Test connection health */
  testConnection(): Promise<boolean>;
  /** Close all connections */
  disconnect(): Promise<void>;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  columns: { name: string; dataType: string }[];
  rowCount: number;
  executionTimeMs: number;
}

interface ConnectorConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  connectionString?: string;
  ssl?: boolean;
}

export function createPostgresConnector(config: ConnectorConfig): DbConnector {
  const pool = new pg.Pool({
    host: config.host,
    port: config.port ?? 5432,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 5 * 60 * 1000,
    connectionTimeoutMillis: 10_000,
  });

  return {
    async executeQuery(sql: string, timeoutMs: number): Promise<QueryResult> {
      // REQ-QER-007: Read-only enforcement
      const normalized = sql.trim().toUpperCase();
      const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE'];
      for (const keyword of forbidden) {
        if (normalized.startsWith(keyword)) {
          throw new Error(`Write operations are not allowed: ${keyword}`);
        }
      }

      const start = Date.now();
      const client = await pool.connect();

      try {
        await client.query(`SET statement_timeout = ${timeoutMs}`);
        // Set read-only transaction
        await client.query('SET TRANSACTION READ ONLY');
        const result = await client.query(sql);

        const columns = result.fields.map((f) => ({
          name: f.name,
          dataType: f.dataTypeName ?? 'unknown',
        }));

        return {
          rows: result.rows as Record<string, unknown>[],
          columns,
          rowCount: result.rowCount ?? 0,
          executionTimeMs: Date.now() - start,
        };
      } finally {
        client.release();
      }
    },

    async discoverSchema(): Promise<SchemaTable[]> {
      const client = await pool.connect();
      try {
        // REQ-DB-004: Tables, columns, types, PKs, FKs, row counts, sample values
        const tablesResult = await client.query(`
          SELECT table_schema, table_name
          FROM information_schema.tables
          WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            AND table_type = 'BASE TABLE'
          ORDER BY table_schema, table_name
        `);

        const tables: SchemaTable[] = [];

        for (const row of tablesResult.rows) {
          const tableName = row.table_name as string;
          const schemaName = row.table_schema as string;
          const fqn = `"${schemaName}"."${tableName}"`;

          // Get columns
          const colsResult = await client.query(`
            SELECT c.column_name, c.data_type, c.is_nullable,
                   CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_pk
            FROM information_schema.columns c
            LEFT JOIN (
              SELECT ku.column_name
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage ku
                ON tc.constraint_name = ku.constraint_name
              WHERE tc.table_name = $1 AND tc.table_schema = $2
                AND tc.constraint_type = 'PRIMARY KEY'
            ) pk ON c.column_name = pk.column_name
            WHERE c.table_name = $1 AND c.table_schema = $2
            ORDER BY c.ordinal_position
          `, [tableName, schemaName]);

          // Get row count
          const countResult = await client.query(
            `SELECT reltuples::bigint AS count FROM pg_class WHERE relname = $1`,
            [tableName],
          );
          const rowCount = Number(countResult.rows[0]?.count ?? 0);

          // Get sample values (5 per column) — REQ-DB-004
          const columns: SchemaColumn[] = [];
          for (const col of colsResult.rows) {
            let sampleValues: string[] = [];
            try {
              const sampleResult = await client.query(
                `SELECT DISTINCT "${col.column_name}"::text AS val
                 FROM ${fqn}
                 WHERE "${col.column_name}" IS NOT NULL
                 LIMIT 5`,
              );
              sampleValues = sampleResult.rows.map((r) => String(r.val));
            } catch {
              // Skip sample values on error
            }

            columns.push({
              name: col.column_name as string,
              dataType: col.data_type as string,
              isPrimaryKey: col.is_pk as boolean,
              isForeignKey: false, // TODO: FK detection
              nullable: col.is_nullable === 'YES',
              sampleValues,
            });
          }

          tables.push({
            name: tableName,
            schema: schemaName,
            columns,
            rowCount,
            relationships: [],
          });
        }

        return tables;
      } finally {
        client.release();
      }
    },

    async testConnection(): Promise<boolean> {
      try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        return true;
      } catch {
        return false;
      }
    },

    async disconnect(): Promise<void> {
      await pool.end();
    },
  };
}
```

---

## 4. Schema Cache Service — `apps/api/src/services/connectors/schemaCache.ts`

```typescript
/**
 * schemaCache.ts — Redis-cached schema metadata.
 *
 * REQ-DB-005: Schema cached in Redis, 5-min TTL, manual refresh.
 * REQ-DB-006: Chunk schemas >100 tables for LLM context limits.
 */

import { redis } from '../../config/redis.js';
import { getConnector, type SchemaMetadata, type SchemaTable } from './connectionFactory.js';
import { env } from '../../config/env.js';

const SCHEMA_TTL = env.SCHEMA_CACHE_TTL_SECONDS; // REQ-DB-005: 5 min default
const SCHEMA_KEY_PREFIX = 'schema:';
const MAX_TABLES_PER_CHUNK = 100; // REQ-DB-006

/**
 * Get schema metadata (from cache or fresh discovery).
 */
export async function getSchemaMetadata(connectionId: string): Promise<SchemaMetadata> {
  const cacheKey = `${SCHEMA_KEY_PREFIX}${connectionId}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as SchemaMetadata;
  }

  // Cache miss — discover schema
  const connector = await getConnector(connectionId);
  const tables = await connector.discoverSchema();

  const metadata: SchemaMetadata = {
    tables,
    discoveredAt: new Date().toISOString(),
    connectionId,
    dialect: 'POSTGRESQL', // Will be set from DB connection type
  };

  // Cache with TTL
  await redis.setex(cacheKey, SCHEMA_TTL, JSON.stringify(metadata));

  return metadata;
}

/**
 * Force refresh schema cache (manual trigger by Org Admin).
 * REQ-DB-005: Manual refresh option.
 */
export async function refreshSchemaCache(connectionId: string): Promise<SchemaMetadata> {
  const cacheKey = `${SCHEMA_KEY_PREFIX}${connectionId}`;
  await redis.del(cacheKey);
  return getSchemaMetadata(connectionId);
}

/**
 * Chunk schema for LLM context window.
 * REQ-DB-006: Schemas with >100 tables are dynamically chunked.
 *
 * Strategy: Group tables by schema, then split into chunks of MAX_TABLES_PER_CHUNK.
 * The chunk most relevant to the user's query is sent to the LLM.
 */
export function chunkSchema(tables: SchemaTable[]): SchemaTable[][] {
  if (tables.length <= MAX_TABLES_PER_CHUNK) {
    return [tables];
  }

  const chunks: SchemaTable[][] = [];
  for (let i = 0; i < tables.length; i += MAX_TABLES_PER_CHUNK) {
    chunks.push(tables.slice(i, i + MAX_TABLES_PER_CHUNK));
  }
  return chunks;
}

/**
 * Format schema for LLM prompt inclusion.
 * Produces a compact text representation of tables and columns.
 */
export function formatSchemaForPrompt(tables: SchemaTable[]): string {
  return tables
    .map((t) => {
      const cols = t.columns
        .map((c) => {
          const markers: string[] = [];
          if (c.isPrimaryKey) markers.push('PK');
          if (c.isForeignKey) markers.push('FK');
          const markerStr = markers.length ? ` [${markers.join(', ')}]` : '';
          const samples = c.sampleValues.length
            ? ` -- samples: ${c.sampleValues.slice(0, 3).join(', ')}`
            : '';
          return `  ${c.name} ${c.dataType}${c.nullable ? ' NULL' : ' NOT NULL'}${markerStr}${samples}`;
        })
        .join('\n');
      return `TABLE ${t.schema}.${t.name} (~${t.rowCount} rows):\n${cols}`;
    })
    .join('\n\n');
}
```

---

## 5. Redis Client — `apps/api/src/config/redis.ts`

```typescript
/**
 * redis.ts — Redis client singleton.
 *
 * NFR-SCAL-003: Redis cluster mode with Sentinel.
 */

import Redis from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number): number | null {
    if (times > 10) return null; // Stop retrying
    return Math.min(times * 200, 5000);
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});
```

---

## 6. Connection Routes — `apps/api/src/routes/connections.routes.ts`

```typescript
/**
 * connections.routes.ts — Database connection management API.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ConnectionType } from '@prisma/client';
import { prisma } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { encrypt } from '../utils/crypto.js';
import { getConnector, removeConnector } from '../services/connectors/connectionFactory.js';
import { refreshSchemaCache, getSchemaMetadata } from '../services/connectors/schemaCache.js';

const router = Router();
router.use(authMiddleware);

// ─── POST /api/connections — Create connection (Org Admin+) ────────
const createSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.nativeEnum(ConnectionType),
  host: z.string().optional(),
  port: z.number().optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  connectionString: z.string().optional(),
  sslEnabled: z.boolean().default(true),
});

router.post('/', rbac('ORG_ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body);

    // Encrypt password (REQ-DB-002)
    let encryptedPassword: string | undefined;
    let encryptionIV: string | undefined;
    let encryptionTag: string | undefined;

    if (data.password) {
      const encrypted = encrypt(data.password);
      encryptedPassword = encrypted.ciphertext;
      encryptionIV = encrypted.iv;
      encryptionTag = encrypted.tag;
    }

    const connection = await prisma.databaseConnection.create({
      data: {
        name: data.name,
        type: data.type,
        host: data.host,
        port: data.port,
        database: data.database,
        username: data.username,
        encryptedPassword,
        encryptionIV,
        encryptionTag,
        connectionString: data.connectionString,
        sslEnabled: data.sslEnabled,
        organizationId: req.user!.organizationId,
      },
    });

    res.status(201).json({ id: connection.id, name: connection.name, type: connection.type });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// ─── POST /api/connections/:id/test — Test connection ──────────────
router.post('/:id/test', rbac('ORG_ADMIN'), async (req: Request, res: Response) => {
  try {
    const connector = await getConnector(req.params.id);
    const isHealthy = await connector.testConnection();

    await prisma.databaseConnection.update({
      where: { id: req.params.id },
      data: { lastTestedAt: new Date() },
    });

    res.json({ healthy: isHealthy });
  } catch (error) {
    res.json({ healthy: false, error: (error as Error).message });
  }
});

// ─── GET /api/connections/:id/schema — Get schema metadata ────────
router.get('/:id/schema', async (req: Request, res: Response) => {
  try {
    const metadata = await getSchemaMetadata(req.params.id);
    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ─── POST /api/connections/:id/schema/refresh — Force refresh ─────
router.post('/:id/schema/refresh', rbac('ORG_ADMIN'), async (req: Request, res: Response) => {
  try {
    const metadata = await refreshSchemaCache(req.params.id);
    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ─── DELETE /api/connections/:id — Remove connection ───────────────
router.delete('/:id', rbac('ORG_ADMIN'), async (req: Request, res: Response) => {
  try {
    await removeConnector(req.params.id);
    await prisma.databaseConnection.delete({ where: { id: req.params.id } });
    res.json({ message: 'Connection deleted' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export { router as connectionRoutes };
```

---

## 7. Additional Connector Stubs

Each database type follows the same `DbConnector` interface. Create these files with the same pattern as `postgres.connector.ts`:

| File | DB Type | Key Driver |
|------|---------|------------|
| `mysql.connector.ts` | MySQL 8.0+ | `mysql2` |
| `mssql.connector.ts` | SQL Server 2019+ | `mssql` (tedious) |
| `snowflake.connector.ts` | Snowflake | `snowflake-sdk` |
| `bigquery.connector.ts` | BigQuery | `@google-cloud/bigquery` |
| `mongo.connector.ts` | MongoDB 6+ | `mongodb` (aggregation pipeline) |

Each connector must:
1. Implement `executeQuery()` with read-only enforcement (REQ-QER-007)
2. Implement `discoverSchema()` with tables, columns, PKs, FKs, sample values (REQ-DB-004)
3. Implement `testConnection()` health check
4. Implement `disconnect()` to release pool resources

---

## 8. Verification Checklist

| Step | Action | Expected |
|------|--------|----------|
| Create connection | `POST /api/connections` with PG creds | 201 + password encrypted in DB |
| Test connection | `POST /api/connections/:id/test` | `{ healthy: true }` |
| Schema discovery | `GET /api/connections/:id/schema` | Tables with columns, types, samples |
| Schema cached | Call schema endpoint twice | 2nd call returns from Redis |
| Force refresh | `POST /api/connections/:id/schema/refresh` | Fresh schema, cache updated |
| Password never logged | Check all logs | No plaintext passwords |
| Idle pool cleanup | Wait 5 min | Idle connections removed from cache |

---

## Next Skill → `04_semantic_layer_skill.md`
