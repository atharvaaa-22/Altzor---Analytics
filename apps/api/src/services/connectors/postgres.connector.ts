import pg from 'pg';
import type { SchemaTable, SchemaColumn } from './connectionFactory.js';

export interface DbConnector {
  executeQuery(sql: string, timeoutMs: number): Promise<QueryResult>;
  discoverSchema(): Promise<SchemaTable[]>;
  testConnection(): Promise<boolean>;
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
        await client.query('SET TRANSACTION READ ONLY');
        const result = await client.query(sql);

        const columns = result.fields.map((f) => ({
          name: f.name,
          dataType: String(f.dataTypeID),
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
        const tablesResult = await client.query(`
          SELECT table_schema, table_name
          FROM information_schema.tables
          WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            AND table_type = 'BASE TABLE'
          ORDER BY table_schema, table_name
        `);

        const tables: SchemaTable[] = [];

        const rows = tablesResult.rows as { table_name: string; table_schema: string }[];

        for (const row of rows) {
          const tableName = row.table_name;
          const schemaName = row.table_schema;
          const fqn = `"${schemaName}"."${tableName}"`;

          const colsResult = await client.query(
            `
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
          `,
            [tableName, schemaName],
          );

          const countResult = await client.query(
            `SELECT reltuples::bigint AS count FROM pg_class WHERE relname = $1`,
            [tableName],
          );
          const countRow = countResult.rows[0] as { count?: string | number } | undefined;
          const rowCount = Number(countRow?.count ?? 0);

          const columns: SchemaColumn[] = [];
          const colRows = colsResult.rows as {
            column_name: string;
            data_type: string;
            is_pk: boolean;
            is_nullable: string;
          }[];
          for (const col of colRows) {
            let sampleValues: string[] = [];
            try {
              const sampleResult = await client.query(
                `SELECT DISTINCT "${col.column_name}"::text AS val
                 FROM ${fqn}
                 WHERE "${col.column_name}" IS NOT NULL
                 LIMIT 5`,
              );
              const sampleRows = sampleResult.rows as { val: unknown }[];
              sampleValues = sampleRows.map((r) => String(r.val));
            } catch (err) {
              // Ignore sample errors
            }

            columns.push({
              name: col.column_name,
              dataType: col.data_type,
              isPrimaryKey: col.is_pk,
              isForeignKey: false,
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
