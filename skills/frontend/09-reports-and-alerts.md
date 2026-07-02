# Frontend Specification: Reports & Alerts

## 1. Purpose
Allows users to schedule exports (PDF/CSV) of dashboards and configure data anomaly alerts powered by the BullMQ background workers.

## 2. Goals
- Interface for setting cron-based schedules.
- Form builder for Threshold Alerts ("If Revenue < 1000, send Slack").
- Historical log of sent reports.

## 3. Architecture

### 3.1 Folder Structure
```text
apps/web/src/
├── features/automations/
│   ├── components/
│   │   ├── ReportSchedulerModal.tsx
│   │   ├── AlertBuilderForm.tsx
│   │   └── HistoryLogTable.tsx
```

## 4. API Contracts
| Action | Method | Endpoint | Payload | Response |
| :--- | :--- | :--- | :--- | :--- |
| **Create Report** | `POST` | `/api/reports` | `{ dashboardId, format, cron, emails }` | `201 Created` |
| **Create Alert** | `POST` | `/api/alerts` | `{ queryId, condition, threshold, channels }` | `201 Created` |

## 5. UI Specifications
- **Cron Builder**: Instead of making users type `0 9 * * 1`, provide a human-readable dropdown: "Every Monday at 9:00 AM".
- **Channels**: Toggle switches with logos for Email, Slack, and Webhook.
- **Layout**: Fits seamlessly into the Settings or Dashboard auxiliary tabs.
