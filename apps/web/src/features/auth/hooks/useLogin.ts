import { useState } from 'react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../stores/authStore';

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore(s => s.setAuth);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { user, accessToken } = await api.post<any>('/auth/login', { email, password });
      setAuth(user, accessToken);
      return true;
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
};
