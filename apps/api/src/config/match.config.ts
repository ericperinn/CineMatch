export const matchConfig = {
  FAVORITE_WEIGHT: 1.0,
  DIARY_WEIGHT: 0.4,
  RECENCY_BIAS_WINDOW: 15,        // últimos N filmes do diário considerados
  MIN_RATING_FOR_TASTE: 8,        // escala 0-10 (4★ no Letterboxd = 8)
  PODIUM_SIZE: 3,
  DISLIKE_COOLDOWN_DAYS: 15,
  BATCH_SIZE: 10,
  MIN_QUEUE_BEFORE_REFETCH: 3,
};
