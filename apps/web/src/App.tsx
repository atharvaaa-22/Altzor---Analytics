import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './features/auth';

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
import { AdminPage } from './pages/AdminPage';

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

function ProtectedRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RootRoute(): React.JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboards" replace /> : <Navigate to="/login" replace />;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  return user?.role === 'SUPER_ADMIN' ? <>{children}</> : <Navigate to="/404" replace />;
}

export function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/conversations" element={<ConversationsPage />} />
                    <Route path="/conversations/:id" element={<ConversationsPage />} />
                    <Route path="/dashboards" element={<DashboardsPage />} />
                    <Route path="/dashboards/:id" element={<DashboardViewPage />} />
                    <Route path="/queries" element={<QueriesPage />} />
                    <Route path="/files" element={<FilesPage />} />
                    <Route path="/connections" element={<ConnectionsPage />} />
                    <Route path="/semantic" element={<SemanticPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route
                      path="/admin"
                      element={
                        <SuperAdminRoute>
                          <AdminPage />
                        </SuperAdminRoute>
                      }
                    />
                    <Route
                      path="/404"
                      element={
                        <div className="p-8 text-white text-center text-xl">404 - Not Found</div>
                      }
                    />
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
