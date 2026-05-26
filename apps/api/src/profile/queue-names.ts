/**
 * Queue names — MUST stay in sync with apps/worker/src/queues/queue-names.ts.
 * Future refactor: move into a shared package once we have more than 2 of these.
 */
export const QUEUE_NAMES = {
  SYNC_PROFILE: "sync-profile",
} as const;

export interface SyncProfileJob {
  userId: string;
}
