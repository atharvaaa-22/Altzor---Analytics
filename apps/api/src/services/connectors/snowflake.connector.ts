import type { DbConnector } from './postgres.connector.js';

export function createSnowflakeConnector(_config: unknown): DbConnector {
  throw new Error('Snowflake connector not implemented');
}
