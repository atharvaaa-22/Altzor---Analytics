import { useState } from 'react';
import { api } from '../../../lib/api';
import { useAuthStore, type User } from '../stores/authStore';

export const useLogin = (): {
  login: (email: string, password: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
} => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { user, accessToken } = await api.post<{ user: User; accessToken: string }>(
        '/auth/login',
        { email, password },
      );
      setAuth(user, accessToken);
      return true;
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Invalid email or password');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
};
