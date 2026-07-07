import { prisma } from '../../config/db.js';
import { decrypt } from '../../utils/crypto.js';
import { createPostgresConnector, type DbConnector } from './postgres.connector.js';
import { createMysqlConnector } from './mysql.connector.js';
import { createMssqlConnector } from './mssql.connector.js';
import { createSnowflakeConnector } from './snowflake.connector.js';
import { createBigQueryConnector } from './bigquery.connector.js';
import { createMongoConnector } from './mongo.connector.js';

export type ConnectionType =
  'POSTGRESQL' | 'MYSQL' | 'MSSQL' | 'SNOWFLAKE' | 'BIGQUERY' | 'MONGODB' | 'SQLITE';

export type { DbConnector };

export interface SchemaColumn {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyRef?: { table: string; column: string };
  nullable: boolean;
  sampleValues: string[];
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

const poolCache = new Map<string, { connector: DbConnector; lastUsed: number }>();

setInterval(
  () => {
    const now = Date.now();
    const IDLE_TIMEOUT = 5 * 60 * 1000;
    for (const [key, entry] of poolCache) {
      if (now - entry.lastUsed > IDLE_TIMEOUT) {
        entry.connector.disconnect().catch(() => {});
        poolCache.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

export async function getConnector(connectionId: string): Promise<DbConnector> {
  const cached = poolCache.get(connectionId);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.connector;
  }

  if (connectionId === 'default' || connectionId === 'local') {
    const sqliteConnector = createSqliteConnector();
    poolCache.set(connectionId, { connector: sqliteConnector, lastUsed: Date.now() });
    return sqliteConnector;
  }

  const conn = await prisma.databaseConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });

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

  let connector: DbConnector;
  switch (conn.type) {
    case 'POSTGRESQL':
      connector = createPostgresConnector(config);
      break;
    case 'MYSQL':
      connector = createMysqlConnector(config);
      break;
    case 'MSSQL':
      connector = createMssqlConnector(config);
      break;
    case 'SNOWFLAKE':
      connector = createSnowflakeConnector(config);
      break;
    case 'BIGQUERY':
      connector = createBigQueryConnector(config);
      break;
    case 'MONGODB':
      connector = createMongoConnector(config);
      break;
    default:
      throw new Error(`Unsupported database type: ${conn.type}`);
  }

  poolCache.set(connectionId, { connector, lastUsed: Date.now() });
  return connector;
}

export async function removeConnector(connectionId: string): Promise<void> {
  const cached = poolCache.get(connectionId);
  if (cached) {
    await cached.connector.disconnect();
    poolCache.delete(connectionId);
  }
}

export async function testRawConnection(
  type: ConnectionType,
  config: Record<string, unknown>,
): Promise<boolean> {
  let connector: DbConnector;
  switch (type) {
    case 'POSTGRESQL':
      connector = createPostgresConnector(config);
      break;
    case 'MYSQL':
      connector = createMysqlConnector(config);
      break;
    case 'MSSQL':
      connector = createMssqlConnector(config);
      break;
    case 'SNOWFLAKE':
      connector = createSnowflakeConnector(config);
      break;
    case 'BIGQUERY':
      connector = createBigQueryConnector(config);
      break;
    case 'MONGODB':
      connector = createMongoConnector(config);
      break;
    default:
      throw new Error(`Unsupported database type: ${String(type)}`);
  }

  const isHealthy = await connector.testConnection();
  await connector.disconnect().catch(() => {});
  return isHealthy;
}

function sanitizeBigInt(value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value);
  if (value !== null && typeof value === 'object') {
    if (Array.isArray(value)) return value.map(sanitizeBigInt);
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitizeBigInt(v)]),
    );
  }
  return value;
}

function createSqliteConnector(): DbConnector {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async executeQuery(sql: string, _timeoutMs: number): Promise<any> {
      const normalized = sql.trim().toUpperCase();
      const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE'];
      for (const keyword of forbidden) {
        if (normalized.startsWith(keyword)) {
          throw new Error(`Write operations are not allowed: ${keyword}`);
        }
      }

      const start = Date.now();
      const rawRows = await prisma.$queryRawUnsafe(sql);

      // Prisma returns COUNT(*) and other aggregates as BigInt — convert to numbers
      const rows = sanitizeBigInt(rawRows) as Record<string, unknown>[];

      const columns =
        rows.length > 0
          ? Object.keys(rows[0]!).map((key) => ({
              name: key,
              dataType: typeof rows[0]![key] === 'number' ? 'INTEGER' : 'TEXT',
            }))
          : [];

      return {
        rows,
        columns,
        rowCount: rows.length,
        executionTimeMs: Date.now() - start,
      };
    },

    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
    async discoverSchema(): Promise<SchemaTable[]> {
      const tablesResult = await prisma.$queryRawUnsafe(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'`,
      );

      const tables: SchemaTable[] = [];

      for (const t of tablesResult) {
        const tableName = t.name;

        const infoResult = await prisma.$queryRawUnsafe(`PRAGMA table_info("${tableName}")`);

        const columns: SchemaColumn[] = [];
        for (const col of infoResult) {
          let sampleValues: string[] = [];
          try {
            const sampleResult = await prisma.$queryRawUnsafe(
              `SELECT DISTINCT "${col.name}" AS val FROM "${tableName}" WHERE "${col.name}" IS NOT NULL LIMIT 5`,
            );
            sampleValues = sampleResult.map((r) => String(r.val));
          } catch {
            // ignore
          }

          columns.push({
            name: col.name,
            dataType: col.type,
            isPrimaryKey: col.pk > 0,
            isForeignKey: false,
            nullable: col.notnull === 0,
            sampleValues,
          });
        }

        const countResult = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM "${tableName}"`,
        );
        const rowCount = countResult[0] ? Number(countResult[0].count) : 0;

        tables.push({
          name: tableName,
          schema: 'main',
          columns,
          rowCount,
          relationships: [],
        });
      }

      return tables;
    },

    async testConnection(): Promise<boolean> {
      try {
        await prisma.$queryRawUnsafe('SELECT 1');
        return true;
      } catch {
        return false;
      }
    },

    async disconnect(): Promise<void> {},
  };
}
