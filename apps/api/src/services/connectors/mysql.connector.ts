import type { DbConnector } from './postgres.connector.js';

export function createMysqlConnector(_config: unknown): DbConnector {
  throw new Error('MySQL connector not implemented');
}
