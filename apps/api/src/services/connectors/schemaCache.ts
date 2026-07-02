import { redis } from '../../config/redis.js';
import { getConnector, type SchemaMetadata, type SchemaTable } from './connectionFactory.js';
import { env } from '../../config/env.js';

const SCHEMA_TTL = env.SCHEMA_CACHE_TTL_SECONDS;
const SCHEMA_KEY_PREFIX = 'schema:';
const MAX_TABLES_PER_CHUNK = 100;

export async function getSchemaMetadata(connectionId: string): Promise<SchemaMetadata> {
  const cacheKey = `${SCHEMA_KEY_PREFIX}${connectionId}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as SchemaMetadata;
  }

  const connector = await getConnector(connectionId);
  const tables = await connector.discoverSchema();

  const metadata: SchemaMetadata = {
    tables,
    discoveredAt: new Date().toISOString(),
    connectionId,
    dialect: 'POSTGRESQL',
  };

  await redis.setex(cacheKey, SCHEMA_TTL, JSON.stringify(metadata));

  return metadata;
}

export async function refreshSchemaCache(connectionId: string): Promise<SchemaMetadata> {
  const cacheKey = `${SCHEMA_KEY_PREFIX}${connectionId}`;
  await redis.del(cacheKey);
  return getSchemaMetadata(connectionId);
}

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
