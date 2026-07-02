export type ConnectionType = 'postgres' | 'mysql' | 'sqlserver' | 'snowflake' | 'bigquery';
export type ConnectionStatus = 'healthy' | 'failing' | 'syncing';

export interface Connection {
  id: string;
  name: string;
  type: ConnectionType;
  status: ConnectionStatus;
  lastSyncAt?: string;
  error?: string;
}

export interface ConnectionFormData {
  name: string;
  type: ConnectionType;
  config: Record<string, any>;
}
