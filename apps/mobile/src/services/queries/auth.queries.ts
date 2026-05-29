import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { api } from '../api';
import { useAuthStore, User } from '../../store/useAuthStore';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  letterboxdUsername?: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
}

// NestJS returns { message: string | string[] } on validation/auth errors.
export function extractApiError(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message[0];
    if (typeof message === 'string') return message;
    if (!error.response) return 'Cannot reach the server. Is the API running?';
  }
  return fallback;
}

export const useLoginMutation = () => {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (credentials: LoginPayload) => {
      const { data } = await api.post<AuthResponse>('/auth/login', credentials);
      return data;
    },
    onSuccess: (data) => setAuth(data.accessToken, data.user),
  });
};

export const useRegisterMutation = () => {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const letterboxdUsername = payload.letterboxdUsername?.trim();
      const { data } = await api.post<AuthResponse>('/auth/register', {
        name: payload.name.trim(),
        email: payload.email.trim(),
        password: payload.password,
        ...(letterboxdUsername ? { letterboxdUsername } : {}),
      });
      return data;
    },
    onSuccess: (data) => setAuth(data.accessToken, data.user),
  });
};
