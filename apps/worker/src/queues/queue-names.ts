/**
 * Queue names — must stay in sync with apps/api/src/profile/profile.module.ts.
 * If you change these, grep both apps before deploying.
 */
export const QUEUE_NAMES = {
  SYNC_PROFILE: "sync-profile",
  DISCOVER_MOVIE: "discover-movie",
  EMBED_MOVIE: "embed-movie",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface SyncProfileJob {
  userId: string;
}

export interface DiscoverMovieJob {
  letterboxdSlug?: string;
  tmdbId?: string;
}
