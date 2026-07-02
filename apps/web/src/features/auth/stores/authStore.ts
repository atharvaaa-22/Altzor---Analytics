import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
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
