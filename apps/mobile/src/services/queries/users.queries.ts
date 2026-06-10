import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useAuthStore, type User } from '../../store/useAuthStore';
import type { UserSearchResult } from './friends.queries';

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

export interface UpdateNotificationsPayload {
  notifyFriendRequests?: boolean;
  notifySessionInvites?: boolean;
  notifyMatches?: boolean;
}

export const useUpdateNotifications = () => {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (payload: UpdateNotificationsPayload) => {
      const { data } = await api.patch<UpdateMeResponse>(
        '/users/me/notifications',
        payload,
      );
      return data.user;
    },
    onSuccess: (user) => setUser(user),
  });
};

export const useUserById = (id: string | undefined) =>
  useQuery({
    queryKey: ['users', 'byId', id],
    queryFn: async () => {
      const { data } = await api.get<UserSearchResult>(`/users/${id}`);
      return data;
    },
    enabled: !!id && id.length > 0,
    // Always refetch when revisiting — friendship state can change while
    // the user is staring at the confirmation screen.
    staleTime: 0,
  });

