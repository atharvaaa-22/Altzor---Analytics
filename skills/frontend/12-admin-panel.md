# Frontend Specification: System Admin Panel

## 1. Purpose
A super-admin-only dashboard for monitoring the physical health of the Altzor Analytics platform. It tracks Express.js performance, BullMQ queue lengths, Redis memory, and database connection pools.

## 2. Goals
- Real-time polling of system metrics.
- Interface to pause/resume BullMQ queues.
- View real-time application logs.

## 3. Architecture

### 3.1 Folder Structure
```text
apps/web/src/
├── features/admin/
│   ├── components/
│   │   ├── SystemHealthGrid.tsx
│   │   ├── QueueManager.tsx
│   │   └── LiveLogTail.tsx
```

## 4. API Contracts
| Action | Method | Endpoint | Response |
| :--- | :--- | :--- | :--- |
| **Get Health** | `GET` | `/health` | `200 OK`, `{ status: "ok", redis: "connected", db: "connected" }` |
| **Get Queues** | `GET` | `/api/admin/queues` | `200 OK`, `[QueueStats]` |

## 5. UI Specifications
- **Live Log Tail**: A black terminal-like window (`bg-black text-green-400 font-mono text-xs p-4`) streaming logs via SSE.
- **Queue Stats**: Small sparkline charts tracking jobs processed per minute using `recharts`.
- **Security Guard**: The route `/admin` must rigorously check `useAuthStore().user.role === 'SUPER_ADMIN'` and immediately redirect to `/404` if not.
