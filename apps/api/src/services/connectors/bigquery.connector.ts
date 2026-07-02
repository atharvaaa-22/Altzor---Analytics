import type { DbConnector } from './postgres.connector.js';

export function createBigQueryConnector(_config: unknown): DbConnector {
  throw new Error('BigQuery connector not implemented');
}
