import { useMutation } from '@tanstack/react-query';
import { api } from '../api';
import { useAuthStore, type User } from '../../store/useAuthStore';

export interface UpdateMePayload {
  name?: string;
  letterboxdUsername?: string | null;
  avatarUrl?: string | null;
}

interface UpdateMeResponse {
  user: User;
}

export const useUpdateMe = () => {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (payload: UpdateMePayload) => {
      const trimmed = {
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
        ...(payload.letterboxdUsername !== undefined
          ? {
              letterboxdUsername:
                payload.letterboxdUsername === null
                  ? null
                  : payload.letterboxdUsername.trim() || null,
            }
          : {}),
        ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
      };
      const { data } = await api.patch<UpdateMeResponse>('/users/me', trimmed);
      return data.user;
    },
    onSuccess: (user) => setUser(user),
  });
};
