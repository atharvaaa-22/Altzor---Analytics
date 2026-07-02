# Altzor Analytics Platform 🚀

Altzor Analytics is a modern, AI-driven embedded analytics and data exploration platform. It allows users to connect their data sources, define semantic layers, and use Natural Language to SQL (NL2SQL) powered by Google's Gemini to interact with their data dynamically.

## 🏗️ Architecture & Tech Stack

This project is structured as a monorepo using **Turborepo** and npm workspaces.

**Frontend (`apps/web`)**
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS, Framer Motion (for dynamic micro-animations), Lucide React
- **State Management:** Zustand (Auth), TanStack Query (Server State)
- **Routing:** React Router

**Backend (`apps/api`)**
- **Framework:** Node.js + Express.js
- **Database:** Prisma ORM (SQLite for dev, MySQL/Postgres for production)
- **Background Jobs:** BullMQ + Redis
- **Validation:** Zod
- **AI Engine:** Google Gemini API (`@google/generative-ai`)

---

## 🎯 Features Implemented So Far

### 1. Robust API Foundation
- **Express Server Bootstrap**: Fully configured with CORS, Helmet, Rate Limiting, and centralized global error handling.
- **Background Queues**: Integrated BullMQ and Redis for asynchronous tasks like schema synchronization, report delivery, and alerts.
- **Authentication**: JWT-based session management with robust token refresh strategies.

### 2. Database & Semantic Layer
- **Prisma Schema**: Designed a comprehensive multi-tenant schema supporting Organizations, Users, Saved Queries, Dashboards, and Widgets.
- **Data Connectors**: Built service architecture for database connections (PostgreSQL, MSSQL, BigQuery, Snowflake).
- **Semantic Caching**: Implemented a caching layer to store database schemas, table definitions, and relationships to feed into the NL2SQL engine context window efficiently.

### 3. File Uploads & Cloud Storage
- **File Ingestion**: Robust service to upload, parse, and structure CSV, XLSX, JSON, and PDF files.
- **Ephemeral Tables**: Automatically provisions ephemeral database tables to allow SQL querying against user-uploaded flat files.
- **AWS S3**: Securely stores uploaded raw files with server-side encryption.

### 4. Dynamic React Frontend
- **Auth & Routing**: Implemented a `<ProtectedRoute>` wrapper, `Zustand` auth store with local persistence, and seamless Axios-based token refreshes.
- **Premium UI Components**: Built out the primary structural components using a modern, glassmorphic dark-theme aesthetic:
  - **`AppLayout`**: Responsive sidebar navigation with smooth hover and active-state animations.
  - **`LoginPage`**: Dynamic glowing orbs and an animated entrance.
  - **`ConversationsPage`**: The primary NL2SQL interface, structured like a chat app to interact with the data assistant.
  - **`DashboardsPage`**: An animated grid layout for exploring saved data visualizations.

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js (v22+)
- Docker (for Redis)
- Redis server running on `localhost:6379`

### Installation
1. Install all monorepo dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables. Ensure `apps/api/.env` and `.env` contain:
   ```env
   DATABASE_URL="file:./dev.db" # Or your MySQL/Postgres URL
   REDIS_URL="redis://localhost:6379"
   JWT_SECRET="super-secret"
   GOOGLE_GENAI_API_KEY="your-gemini-key"
   ```

3. Run Prisma Migrations:
   ```bash
   npm run db:migrate
   ```

### Running the App
Start both the Vite frontend and Express backend concurrently:
```bash
npm run dev
```
- **Frontend:** http://localhost:5173  *(Note: Port may increment if 5173 is occupied)*
- **Backend:** http://localhost:4000

---

## 📂 Project Structure

```text
altzordb/
├── apps/
│   ├── api/          # Express backend (Controllers, Services, Prisma)
│   └── web/          # React frontend (Pages, Components, Stores)
├── packages/         # Shared workspace libraries (Types, UI components)
├── skills/           # Project specifications and implementation guides
└── package.json      # Turborepo configurations
```
