import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface Friend {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface FriendshipRow {
  id: string;
  status: string;
  since: string;
  friend: Friend;
}

export interface PendingRow {
  id: string;
  status: string;
  createdAt: string;
  // The sender of the incoming request.
  user: Friend;
}

const FRIENDS_KEY = ['friends'];
const PENDING_KEY = ['friends', 'pending'];

// No push notifications yet, so the home screen polls for new friendship
// state (incoming requests, newly accepted friends). 15s is fast enough for
// real-world testing without hammering the default throttler.
const FRIENDS_REFETCH_MS = 15000;

export const useFriends = () =>
  useQuery({
    queryKey: FRIENDS_KEY,
    queryFn: async () => {
      const { data } = await api.get<FriendshipRow[]>('/friends');
      return data;
    },
    refetchInterval: FRIENDS_REFETCH_MS,
  });

export const usePendingFriends = () =>
  useQuery({
    queryKey: PENDING_KEY,
    queryFn: async () => {
      const { data } = await api.get<PendingRow[]>('/friends/pending');
      return data;
    },
    refetchInterval: FRIENDS_REFETCH_MS,
  });

export const useSendFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetId: string) => {
      const { data } = await api.post('/friends/request', { targetId });
      return data;
    },
    onSuccess: () => {
      // The accepted list won't change yet, but invalidate the prefix so
      // the next view picks up any state.
      queryClient.invalidateQueries({ queryKey: FRIENDS_KEY });
    },
  });
};

export const useAcceptFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { data } = await api.post(`/friends/${friendshipId}/accept`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRIENDS_KEY });
    },
  });
};
