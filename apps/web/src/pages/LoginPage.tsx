import React from 'react';
import { Navigate } from 'react-router-dom';
import { AuthLayout, LoginForm, useAuthStore } from '../features/auth';

export function LoginPage(): React.JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboards" replace />;
  }

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to Altzor Analytics">
      <LoginForm />
    </AuthLayout>
  );
}
