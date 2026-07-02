import type { DbConnector } from './postgres.connector.js';

export function createMssqlConnector(_config: unknown): DbConnector {
  throw new Error('MSSQL connector not implemented');
}
