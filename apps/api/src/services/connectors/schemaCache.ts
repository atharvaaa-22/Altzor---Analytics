import { getConnector, type SchemaMetadata, type SchemaTable } from './connectionFactory.js';
import { env } from '../../config/env.js';

const SCHEMA_TTL_MS = env.SCHEMA_CACHE_TTL_SECONDS * 1000;
const MAX_TABLES_PER_CHUNK = 100;

// In-memory schema cache (replaces Redis)
const schemaCache = new Map<string, { data: SchemaMetadata; expiresAt: number }>();

export async function getSchemaMetadata(connectionId: string): Promise<SchemaMetadata> {
  const entry = schemaCache.get(connectionId);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }

  const connector = await getConnector(connectionId);
  const tables = await connector.discoverSchema();

  const metadata: SchemaMetadata = {
    tables,
    discoveredAt: new Date().toISOString(),
    connectionId,
    dialect: connectionId === 'default' || connectionId === 'local' ? 'SQLITE' : 'POSTGRESQL',
  };

  schemaCache.set(connectionId, { data: metadata, expiresAt: Date.now() + SCHEMA_TTL_MS });
  return metadata;
}

export async function refreshSchemaCache(connectionId: string): Promise<SchemaMetadata> {
  schemaCache.delete(connectionId);
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
