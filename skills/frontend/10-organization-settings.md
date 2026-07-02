# Frontend Specification: Organization Settings

## 1. Purpose
Provides the administrative interface for managing the tenant's workspace. This includes user invites, role assignments, API key generation, and audit logging.

## 2. Goals
- Secure, tabbed interface separating Users, Billing, and Security.
- Role-Based Access Control (RBAC) ensuring only `ADMIN` users can render mutative components.
- Seamless optimistic UI for removing users or rotating API keys.

## 3. Architecture

### 3.1 Folder Structure
```text
apps/web/src/
├── features/settings/
│   ├── components/
│   │   ├── SettingsLayout.tsx
│   │   ├── UserManagementTab.tsx
│   │   ├── ApiKeysTab.tsx
│   │   └── AuditLogsTab.tsx
│   ├── hooks/
│   │   └── useOrganization.ts
```

## 4. API Contracts
| Action | Method | Endpoint | Response |
| :--- | :--- | :--- | :--- |
| **Get Users** | `GET` | `/api/orgs/users` | `200 OK`, `[User]` |
| **Invite User** | `POST` | `/api/orgs/invites` | `201 Created` |
| **Revoke Key** | `DELETE`| `/api/orgs/apikeys/:id` | `200 OK` |

## 5. UI Specifications
- **Tabs**: Vertical left-aligned navigation within the Settings page (`Users`, `API Keys`, `Billing`, `Audit Logs`).
- **Data Tables**: Use `@tanstack/react-table` for rendering Audit Logs with server-side pagination.
- **Modals**: "Invite User" modal with email input and Role dropdown (Admin, Editor, Viewer).
