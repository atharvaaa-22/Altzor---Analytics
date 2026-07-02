# Frontend Specification: Semantic Layer

## 1. Purpose
The Semantic Layer module provides a visual interface for data engineers and admins to map their raw database tables into business-friendly terms. This interface dictates how the AI engine (Gemini) understands the database schema, ensuring accurate NL2SQL translation.

## 2. Goals
- Allow users to alias tables and columns with human-readable names.
- Enable the definition of computed metrics and custom dimensions.
- Provide a graph or tree-view of table relationships (Primary Key to Foreign Key mapping).
- Control which columns are visible/accessible to the AI engine (PII masking).

## 3. Architecture

### 3.1 Folder Structure
```text
apps/web/src/
├── features/semantic/
│   ├── components/
│   │   ├── SchemaTree.tsx
│   │   ├── TableEditorPanel.tsx
│   │   ├── RelationshipBuilder.tsx
│   │   └── SyncStatusBadge.tsx
│   ├── hooks/
│   │   └── useSemanticSchema.ts
│   └── stores/
│       └── semanticStore.ts
```

### 3.2 Responsibilities
- **`SchemaTree.tsx`**: Renders a collapsible tree of all tables in the connected database.
- **`TableEditorPanel.tsx`**: The main right-hand panel where users edit column descriptions, aliases, and toggle visibility.
- **`useSemanticSchema.ts`**: Fetches the cached schema from the Express backend and handles partial updates via TanStack Query mutations.

## 4. Component Hierarchy & Data Flow
```text
<SemanticPage> (Fetches full schema tree)
  ├── <Sidebar>
  │    └── <SchemaTree data={schema}> (User clicks a table)
  │
  └── <MainContent>
       └── <TableEditorPanel activeTable={selectedTable}>
            ├── <ColumnVisibilityToggles>
            ├── <AliasInputs>
            └── <DescriptionTextareas>
```

## 5. API Contracts

| Action | Method | Endpoint | Payload | Response |
| :--- | :--- | :--- | :--- | :--- |
| **Get Schema** | `GET` | `/api/connections/:id/schema` | *None* | `200 OK`, `{ tables: [...] }` |
| **Sync DB** | `POST` | `/api/connections/:id/sync` | *None* | `202 Accepted` (Starts BullMQ Job) |
| **Update Table**| `PATCH`| `/api/schema/tables/:id` | `{ alias, description, isVisible }` | `200 OK` |
| **Update Col** | `PATCH`| `/api/schema/columns/:id` | `{ alias, description, isVisible }` | `200 OK` |

**Caching Strategy**: `useSemanticSchema` caches aggressively but is invalidated immediately after any `PATCH` request.
**Optimistic Updates**: Highly recommended for the toggles (Visible/Hidden) to ensure the UI feels instantaneous.

## 6. UI Specifications

### 6.1 Layout Hierarchy & Wireframe
```text
[ Header: "Data Model - Production DB" | Sync Button (Spinning if active) ]
-------------------------------------------------------------------------
[ Left Sidebar: Tree View ] | [ Right Panel: Table "users" ]
[ > public                ] | 
[   # users               ] | [ Table Alias Input: "Customers" ]
[   # orders              ] | [ Description Input: "Platform users" ]
[   # products            ] |
[ > reporting             ] | [ Columns Grid ]
                            | [ Name | Type | Alias | Visibility (Switch) ]
                            | [ id   | UUID | ID    | [ON]                ]
                            | [ email| TEXT | Email | [OFF - PII]         ]
```

### 6.2 Styling Guidelines
- **Tree View**: Use subtle indentation and Lucide icons (`Table`, `Folder`, `Key`) colored in `text-slate-400`.
- **Switches**: Custom toggle switches (e.g., Radix UI Switch) using `bg-blue-600` for active and `bg-slate-700` for inactive.
- **Inputs**: Seamless borderless inputs on hover `hover:bg-slate-800/50` that convert to bordered inputs on focus `focus:ring-1 focus:ring-blue-500`.

### 6.3 Animation Specifications
- **Panel Transition**: When switching tables, the right panel content fades out and slides up slightly `initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}`.

### 6.4 States
- **Syncing State**: If a BullMQ schema-sync job is running, disable all inputs and show a pulsing "Syncing Database..." banner across the top.
- **Empty State**: If the database connection fails or has no tables, show an empty state illustration with a button to "Check Connection Settings".

## 7. Edge Cases & Error Handling
- **Database Schema Drift**: If a column was deleted in the actual database but exists in the semantic layer, the sync job will flag it. The UI must render deleted columns with a red strikethrough and a "Missing from source" tooltip.
- **Validation**: Aliases cannot contain special characters that would break the NL2SQL context injection. Zod validates `^[a-zA-Z0-9_ ]+$`.

## 8. Acceptance Criteria
1. User can rename any table or column for the AI's perspective without altering the physical database.
2. User can toggle column visibility; hidden columns are excluded from the AI payload.
3. Optimistic UI updates make toggling hundreds of columns feel instantaneous.
