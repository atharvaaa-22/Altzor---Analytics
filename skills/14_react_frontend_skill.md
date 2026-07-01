# Skill File 14 — React Frontend Application

## Overview
Set up the React 19 SPA frontend with Vite, shadcn/ui, Tailwind CSS, Zustand state management, TanStack Query for server state, React Router for navigation, and the page-level layout connecting all feature components.

**BRD References:** Section 5.1 (Tier 1 – Frontend), NFR-PERF-003

---

## 1. Vite Config — `apps/web/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/embed': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

---

## 2. Auth Store — `apps/web/src/stores/authStore.ts`

```typescript
/**
 * authStore.ts — Zustand auth state management.
 *
 * Section 5.1: Zustand 4.x for lightweight global state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, token) =>
        set({ user, accessToken: token, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),

      updateToken: (token) =>
        set({ accessToken: token }),
    }),
    { name: 'auth-storage' },
  ),
);
```

---

## 3. API Client — `apps/web/src/lib/api.ts`

```typescript
/**
 * api.ts — Axios-like fetch wrapper with auth headers and token refresh.
 *
 * Handles automatic token refresh on 401 responses.
 */

import { useAuthStore } from '../stores/authStore';

const BASE_URL = '/api';

interface ApiOptions extends RequestInit {
  params?: Record<string, string>;
}

async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { accessToken, updateToken, clearAuth } = useAuthStore.getState();

  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response = await fetch(url.toString(), {
    ...options,
    headers,
    credentials: 'include',
  });

  // Auto-refresh on 401
  if (response.status === 401 && accessToken) {
    const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshResponse.ok) {
      const data = await refreshResponse.json();
      updateToken(data.accessToken);

      // Retry original request
      headers.Authorization = `Bearer ${data.accessToken}`;
      response = await fetch(url.toString(), {
        ...options,
        headers,
        credentials: 'include',
      });
    } else {
      clearAuth();
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>) =>
    apiRequest<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) =>
    apiRequest<T>(path, { method: 'DELETE' }),
};
```

---

## 4. TanStack Query Hooks — `apps/web/src/hooks/useConversations.ts`

```typescript
/**
 * useConversations.ts — TanStack Query hooks for conversations.
 *
 * Section 5.1: TanStack Query 5.x for data fetching, caching, invalidation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  connection?: { name: string; type: string };
}

interface ConversationList {
  conversations: Conversation[];
  total: number;
}

export function useConversations(search?: string) {
  return useQuery({
    queryKey: ['conversations', search],
    queryFn: () =>
      api.get<ConversationList>('/conversations', search ? { search } : undefined),
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId?: string) =>
      api.post<{ id: string }>('/conversations', { connectionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useConversationMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () =>
      api.get<{ messages: unknown[] }>(`/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  });
}
```

---

## 5. App Root — `apps/web/src/App.tsx`

```tsx
/**
 * App.tsx — Root component with routing and providers.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';

// Pages
import { LoginPage } from './pages/LoginPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { DashboardsPage } from './pages/DashboardsPage';
import { DashboardViewPage } from './pages/DashboardViewPage';
import { QueriesPage } from './pages/QueriesPage';
import { FilesPage } from './pages/FilesPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { SemanticPage } from './pages/SemanticPage';
import { SettingsPage } from './pages/SettingsPage';

// Layout
import { AppLayout } from './components/shared/AppLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/conversations" replace />} />
                    <Route path="/conversations" element={<ConversationsPage />} />
                    <Route path="/conversations/:id" element={<ConversationsPage />} />
                    <Route path="/dashboards" element={<DashboardsPage />} />
                    <Route path="/dashboards/:id" element={<DashboardViewPage />} />
                    <Route path="/queries" element={<QueriesPage />} />
                    <Route path="/files" element={<FilesPage />} />
                    <Route path="/connections" element={<ConnectionsPage />} />
                    <Route path="/semantic" element={<SemanticPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

---

## 6. Web Package Config — `apps/web/package.json`

```json
{
  "name": "@platform/web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src/",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.45.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-grid-layout": "^1.4.0",
    "react-markdown": "^9.0.0",
    "react-router-dom": "^6.24.0",
    "recharts": "^2.12.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.45.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/react-grid-layout": "^1.3.5",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.3.0",
    "vitest": "^1.6.0"
  }
}
```

---

## 7. Verification Checklist

| Step | Command | Expected |
|------|---------|----------|
| Start frontend | `npm run dev` in `apps/web` | Vite dev server on `localhost:5173` |
| Proxy works | API calls from browser | Proxied to `localhost:4000` |
| Login flow | Navigate to `/login` | Login form → auth store populated |
| Protected route | Access `/conversations` without auth | Redirected to `/login` |
| Navigation | Click sidebar links | Pages render without full reload |
| Token refresh | Wait for token expiry | Auto-refresh, no logout |
| TanStack caching | Load conversations twice | 2nd load instant from cache |
| Zustand persists | Refresh browser | Auth state preserved |

---

## Next Skill → `15_testing_qa_skill.md`
