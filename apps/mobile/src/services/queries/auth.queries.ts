import { useMutation } from '@tanstack/react-query';
import { api } from '../api';
import { useAuthStore } from '../../store/useAuthStore';

// Assuming Phase 3 REST endpoints: POST /auth/login, POST /auth/register

export const useLoginMutation = () => {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (credentials: any) => {
      const { data } = await api.post('/auth/login', credentials);
      return data;
    },
    onSuccess: (data) => {
      if (data.token && data.user) {
        setAuth(data.token, data.user);
      }
    },
  });
};

export const useRegisterMutation = () => {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (userData: any) => {
      const { data } = await api.post('/auth/register', userData);
      return data;
    },
    onSuccess: (data) => {
      if (data.token && data.user) {
        setAuth(data.token, data.user);
      }
    },
  });
};
