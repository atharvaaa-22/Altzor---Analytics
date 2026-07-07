import { prisma } from '../../config/db.js';
import { decrypt } from '../../utils/crypto.js';
import { createPostgresConnector, type DbConnector } from './postgres.connector.js';
import { createMysqlConnector } from './mysql.connector.js';
import { createMssqlConnector } from './mssql.connector.js';
import { createSnowflakeConnector } from './snowflake.connector.js';
import { createBigQueryConnector } from './bigquery.connector.js';
import { createMongoConnector } from './mongo.connector.js';

export type ConnectionType =
  'POSTGRESQL' | 'MYSQL' | 'MSSQL' | 'SNOWFLAKE' | 'BIGQUERY' | 'MONGODB';

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
