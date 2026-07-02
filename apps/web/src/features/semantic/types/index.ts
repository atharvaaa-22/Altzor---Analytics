export interface SemanticColumn {
  id: string;
  name: string;
  type: string;
  alias?: string;
  description?: string;
  isVisible: boolean;
  isDeletedFromSource?: boolean;
}

export interface SemanticTable {
  id: string;
  name: string;
  schema: string;
  alias?: string;
  description?: string;
  columns: SemanticColumn[];
}

export interface SemanticSchema {
  tables: SemanticTable[];
}
