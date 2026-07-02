# Frontend Specification: Project Overview & Standards

## 1. Purpose
This document serves as the root index and foundational standard for the Altzor Analytics frontend application. It defines the core philosophical approach to building the React 19 UI, ensuring a "$100M SaaS" aesthetic, flawless performance, and strict alignment with the Express.js backend.

## 2. Global Architecture
Altzor Analytics operates a **React 19** Single Page Application (SPA) bundled via **Vite**.

- **Routing**: `react-router-dom` v7. Centralized layout wrappers dictate authentication guards.
- **Server State**: `@tanstack/react-query` v5. Responsible for caching, deduplication, and optimistic updates.
- **Client State**: `zustand` v5. Strictly used for global UI state (e.g., active theme, sidebar expansion) and Auth tokens.
- **Styling**: `tailwindcss` v4. Utility-first approach with centralized theme tokens.
- **Components**: Radix UI primitives wrapped with Tailwind (inspired by `shadcn/ui`).
- **Animations**: `framer-motion` v12. Used exclusively for layout transitions, micro-interactions, and complex state changes.

## 3. The "Linear/Wisdom AI" Aesthetic Philosophy
The frontend MUST adhere to the following design principles:

### 3.1 Visuals
- **Dark-Mode First (Glassmorphism)**: Backgrounds are deep slates (`bg-slate-950`). Elevated surfaces use translucent backgrounds (`bg-slate-900/50`) with backdrop filters (`backdrop-blur-xl`) and subtle borders (`border-slate-800`).
- **Typography**: Inter or Geist sans-serif. Tight tracking on headings (`tracking-tight`), generous line-height on paragraphs.
- **Gradients**: Accent colors are built using subtle gradients (e.g., `from-blue-600 to-indigo-600`) rather than flat colors.
- **Shadows**: Soft, colored, diffused shadows for active elements, not harsh drop shadows.

### 3.2 Interactions
- **Micro-animations**: Every hover, focus, and active state must have a transition. Buttons scale down slightly on click (`whileTap={{ scale: 0.98 }}`).
- **Zero-Layout Shift**: Skeleton loaders must exactly match the dimensions of the final loaded content.
- **Instantaneous Feel**: Every mutative action (toggles, favorites, deletes) must use Optimistic Updates via TanStack Query.

## 4. Backend Synchronization Rules
The backend is already established (Express, Prisma, BullMQ, Redis, Zod, Gemini). The frontend MUST abide by these integration rules:

1. **No Mock Endpoints**: The frontend must consume `/api/*` endpoints exactly as defined by the backend Express routes.
2. **Error Normalization**: The backend uses a centralized error handler returning `{ error: string, correlationId: string }`. The frontend Axios/Fetch interceptor MUST catch this and throw standard JS errors for React Query to ingest.
3. **Pagination**: Large datasets (Files, Query History) must implement infinite scrolling or standard pagination using the backend's `?page=1&limit=50` standards.
4. **Job Polling**: Long-running backend tasks (e.g., BullMQ schema syncs, heavy file uploads) must be polled by the frontend or listened to via WebSockets/SSE.

## 5. Directory Structure Standard
Every feature module MUST follow a domain-driven structure within `apps/web/src/features/`:

```text
feature-name/
├── api/          # API hooks (useCreateItem, useGetItems)
├── components/   # Feature-specific React components
├── hooks/        # Local state/logic hooks
├── stores/       # Zustand slices for this specific feature
├── types/        # TypeScript interfaces matching backend Prisma models
└── index.ts      # Public API exports for this feature
```

## 6. Specification Index
The following specification files detail the implementation of each module:

1. `01-authentication.md`
2. `02-ai-conversation.md`
3. `03-dashboard-builder.md`
4. `04-semantic-layer.md`
*(...remaining specs to be generated...)*
