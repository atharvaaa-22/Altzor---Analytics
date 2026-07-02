# Frontend Specification: SQL Playground

## 1. Purpose
For advanced users and data engineers to write, validate, execute, and save raw SQL queries directly against their connected databases.

## 2. Goals
- Provide a robust IDE-like experience using Monaco Editor or CodeMirror.
- Syntax highlighting and autocomplete based on the semantic layer schema.
- Resizable split-pane layout (Editor on top/left, Results on bottom/right).
- Seamless integration with the AI engine to "Explain" or "Optimize" queries.

## 3. Architecture

### 3.1 Folder Structure
```text
apps/web/src/
├── features/sql-playground/
│   ├── components/
│   │   ├── PlaygroundLayout.tsx
│   │   ├── SqlEditor.tsx
│   │   ├── ResultsGrid.tsx
│   │   └── SavedQueriesSidebar.tsx
│   ├── hooks/
│   │   └── useSqlExecution.ts
```

### 3.2 Responsibilities
- **`SqlEditor.tsx`**: Wraps `@monaco-editor/react`. Injects the database schema into Monaco's Intellisense engine.
- **`ResultsGrid.tsx`**: High-performance data grid (e.g., `ag-grid-react` or `@tanstack/react-table` with virtualization).

## 4. Sequence Diagrams
```mermaid
sequenceDiagram
    actor DataEngineer
    participant UI as SqlEditor
    participant API as /api/query
    
    DataEngineer->>UI: Types "SELECT * FROM users;"
    DataEngineer->>UI: Hits Cmd+Enter
    UI->>API: POST /api/query/execute { sql, connectionId }
    API-->>UI: 200 OK { columns: [...], rows: [...] }
    UI->>DataEngineer: Renders ResultsGrid (10ms)
```

## 5. API Contracts
- **Execute**: `POST /api/query/execute` -> `{ sql, connectionId }`
- **Explain (AI)**: `POST /api/query/explain` -> `{ sql }` returns AI Markdown.
- **Save Query**: `POST /api/queries/saved` -> `{ name, sql, connectionId }`

## 6. UI Specifications
- **Editor Theme**: Monaco standard dark theme (`vs-dark`) tailored to match `slate-950`.
- **Keyboard Shortcuts**: `Cmd+Enter` (Mac) / `Ctrl+Enter` (Win) to execute. `Cmd+S` to save.
- **Splitter**: Use a library like `react-resizable-panels` to drag the boundary between the editor and the results table.
