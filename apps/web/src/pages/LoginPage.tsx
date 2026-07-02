import React from 'react';
import { AuthLayout, LoginForm } from '../features/auth';

export function LoginPage() {
  return (
    <AuthLayout 
      title="Welcome Back" 
      subtitle="Sign in to Altzor Analytics"
    >
      <LoginForm />
    </AuthLayout>
  );
}
