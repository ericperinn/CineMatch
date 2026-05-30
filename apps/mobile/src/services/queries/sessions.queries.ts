import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export interface SessionHistoryMovie {
  id: string;
  title: string;
  year: number | null;
  posterPath: string | null;
}

export interface SessionHistoryEntry {
  id: string;
  mode: string;
  status: 'COMPLETED' | 'ABANDONED';
  createdAt: string;
  finishedAt: string | null;
  role: 'host' | 'guest';
  partner: { id: string; name: string; avatarUrl: string | null };
  podium: SessionHistoryMovie[];
}

export const useSessionHistory = () =>
  useQuery({
    queryKey: ['sessions', 'history'],
    queryFn: async () => {
      const { data } = await api.get<SessionHistoryEntry[]>('/sessions/history');
      return data;
    },
    staleTime: 30_000,
  });
