import { useCallback } from 'react';
import { ApiError, apiFetch } from '@/config/api';
import { useAuth } from '@/store/AuthContext';

export function useAuthApi() {
  const { signOut } = useAuth();

  const authApiFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      try {
        return await apiFetch(endpoint, options);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await signOut();
          throw new Error('Sua sessao expirou. Faca login novamente.');
        }
        throw error;
      }
    },
    [signOut]
  );

  return { authApiFetch };
}
