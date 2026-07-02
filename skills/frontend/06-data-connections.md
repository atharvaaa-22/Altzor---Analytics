# Frontend Specification: Data Connections

## 1. Purpose
Allows users to securely connect, manage, and test external databases (PostgreSQL, MySQL, SQL Server, Snowflake, BigQuery). It acts as the gateway before the Semantic Layer can operate.

## 2. Goals
- Secure input forms for sensitive credentials (passwords, TLS certs).
- Instant "Test Connection" feedback.
- Clear status indicators (Healthy, Failing, Syncing).

## 3. Architecture

### 3.1 Folder Structure
```text
apps/web/src/
├── features/connections/
│   ├── components/
│   │   ├── ConnectionList.tsx
│   │   ├── ConnectionCard.tsx
│   │   ├── AddConnectionModal.tsx
│   │   └── forms/
│   │       ├── PostgresForm.tsx
│   │       ├── SnowflakeForm.tsx
│   │       └── BigQueryForm.tsx
│   ├── hooks/
│   │   └── useConnections.ts
```

### 3.2 Responsibilities
- **`AddConnectionModal.tsx`**: Dynamic multi-step form. Step 1: Select Type. Step 2: Enter Credentials.
- **`ConnectionCard.tsx`**: Displays the connection name, type, last sync time, and a status dot (Green/Red).

## 4. API Contracts

| Action | Method | Endpoint | Payload | Response | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Get All** | `GET` | `/api/connections` | *None* | `200 OK`, `[Connections]` | Passwords never returned. |
| **Create** | `POST` | `/api/connections` | `{ name, type, config }` | `201 Created` | Config is AES encrypted. |
| **Test** | `POST` | `/api/connections/test` | `{ type, config }` | `200 OK` or `400 Error` | Validates without saving. |

## 5. UI Specifications

### 5.1 Wireframe
```text
[ Page Header: "Data Connections" | Button: "+ Add Connection" ]
--------------------------------------------------------------
[ Postgres Card ] [ Snowflake Card ] [ BigQuery Card ]
[ "Prod DB"     ] [ "Data Lake"    ] [ "Events"      ]
[ (Green) Active] [ (Red) Failing  ] [ (Green) Active]
[ Sync: 2m ago  ] [ Sync: N/A      ] [ Sync: 1h ago  ]
```

### 5.2 Styling & Animations
- **Modals**: Full-screen or large centered modals (`bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-2xl`).
- **Connection Icons**: SVGs for Postgres, MySQL, etc., sitting inside a `bg-slate-800 p-3 rounded-lg` wrapper.
- **Form Fields**: Labels must float or sit clearly above inputs. Passwords strictly `type="password"`.

## 6. Edge Cases
- **Connection Failure**: If the backend cannot reach the database, the `Test Connection` button turns red and the exact database driver error (e.g., `Timeout`, `Access Denied`) is rendered in a monospace alert block so engineers can debug it.
