import type { DbConnector } from './postgres.connector.js';

export function createMongoConnector(_config: unknown): DbConnector {
  throw new Error('MongoDB connector not implemented');
}
