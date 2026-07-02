import { useAuthStore } from '../features/auth';

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

  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) =>
    apiRequest<T>(path, { method: 'DELETE' }),
};
