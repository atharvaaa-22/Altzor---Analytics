# Altzor Analytics Platform 🚀

Altzor Analytics is a modern, AI-driven embedded analytics and data exploration platform. It allows users to connect multiple database sources, define semantic layers, and use Natural Language to SQL (NL2SQL) powered by Google's Gemini to seamlessly interact with their data, visualize it in dashboards, and embed insights anywhere.

## 🏗️ Architecture & Tech Stack

This project is structured as a monorepo using **Turborepo** and npm workspaces.

### Frontend (`apps/web`)

- **Framework:** React 19 + Vite + TypeScript
- **Styling:** Tailwind CSS (v4), Framer Motion (for dynamic micro-animations), Lucide React
- **State Management:** Zustand (Client state), TanStack Query (Server state)
- **Routing:** React Router v7
- **UI Libraries:**
  - `recharts` for data visualization
  - `react-grid-layout` & `react-resizable-panels` for drag-and-drop dashboards
  - `@tanstack/react-table` for highly performant data grids
  - `@monaco-editor/react` for the in-app SQL editor
  - `react-markdown` for rendering AI chat responses

### Backend (`apps/api`)

- **Framework:** Node.js + Express.js + TypeScript
- **Database:** Prisma ORM (SQLite for dev, multi-DB support for analytics)
- **Background Jobs:** BullMQ + Redis for asynchronous processing
- **Validation:** Zod
- **AI Engine:** Google Gemini API (`@google/generative-ai`)
- **File Parsing:** `csv-parse`, `xlsx`, `pdf-parse`, `mammoth`
- **Cloud Storage:** AWS S3 (`@aws-sdk/client-s3`)

---

## 🎯 Core Features

### 1. 🔌 Data Connectors & Ephemeral Files

- **Multi-Database Support:** Connects directly to PostgreSQL, MySQL, MSSQL, BigQuery, Snowflake, and MongoDB.
- **File Ingestion:** Upload CSV, XLSX, JSON, and PDF files. The backend securely stores them in S3 and automatically provisions ephemeral database tables to allow instant SQL querying against uploaded flat files.

### 2. 🧠 Semantic Layer

- Map raw, technical database tables and columns into business-friendly AI concepts.
- Define "AI Aliases", descriptions, and toggle column visibility to optimize the NL2SQL context window.
- Background jobs sync database schemas, table definitions, and data samples automatically.

### 3. 💬 NL2SQL AI Assistant (Conversations)

- A chat-like interface powered by Google Gemini.
- Translates natural language questions into accurate SQL queries using the configured Semantic Layer.
- Executes queries safely and renders the results in interactive tables or charts, complete with markdown explanations.

### 4. 📊 Dashboards & Visualizations

- Fully customizable, drag-and-drop dashboards using a grid layout.
- Save SQL queries and visualize them using dynamic Recharts integrations.
- Multi-tenant data isolation ensures users only see visualizations for their organization.

### 5. 🤝 Collaboration & Embedded Analytics

- Share dashboards, queries, and conversations with other roles/users inside your organization.
- **Embedded Analytics:** Generate secure, embeddable links/iframes to integrate dashboards directly into external applications.

### 6. 🛡️ Robust API & Admin Foundation

- **Express Server Bootstrap**: Configured with CORS, Helmet, Rate Limiting, and centralized global error handling.
- **Authentication & Security**: JWT-based session management with automatic token refreshing and password encryption.
- **Admin & Audit Logging**: Built-in audit trails and admin dashboards to monitor application usage and security events.

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

3. Run Prisma Migrations and Seed the Database:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
   _(Note: The seed script will generate default admin credentials for local testing.)_

### Running the App

Start both the Vite frontend and Express backend concurrently from the root directory:

```bash
npm run dev
```

- **Frontend:** http://localhost:5173 _(Note: Port may increment if 5173 is occupied)_
- **Backend:** http://localhost:4000

---

## 📂 Project Structure

```text
altzordb/
├── apps/
│   ├── api/          # Express backend (Controllers, Routes, Services, Jobs)
│   └── web/          # React frontend (Pages, Components, Hooks, Store)
├── packages/         # Shared workspace libraries (Types, UI components)
├── skills/           # Project specifications and AI implementation guides
└── package.json      # Turborepo configurations & scripts
```
