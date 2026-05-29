import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface ProfileStatus {
  letterboxdUsername: string | null;
  lastSyncedAt: string | null;
  tasteCount: number;
  watchlistCount: number;
  tasteByFavorites: number;
  tasteByDiary: number;
  currentSync: { jobId: string; state: string } | null;
}

const PROFILE_STATUS_KEY = ['profile', 'letterboxd', 'status'];

export const useProfileStatus = (enabled = true) =>
  useQuery({
    queryKey: PROFILE_STATUS_KEY,
    queryFn: async () => {
      const { data } = await api.get<ProfileStatus>('/profile/letterboxd/status');
      return data;
    },
    enabled,
    // Poll while a sync job is running so counts update live.
    refetchInterval: (query) =>
      query.state.data?.currentSync?.state &&
      ['waiting', 'active', 'delayed'].includes(query.state.data.currentSync.state)
        ? 4000
        : false,
  });

export const useSyncProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ jobId: string; queued: boolean }>(
        '/profile/letterboxd/sync'
      );
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROFILE_STATUS_KEY }),
  });
};
