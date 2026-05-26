/**
 * Convert Letterboxd's 0.5-5 star scale to the 0-10 integer scale used
 * by UserMovieTaste.rating.
 *
 * Letterboxd uses 0.5 increments; we map by doubling and rounding to int.
 * 0.5★ = 1, 1★ = 2, ... 4★ = 8, 4.5★ = 9, 5★ = 10.
 */
export function letterboxdRatingToInt(stars: number | null | undefined): number | null {
  if (stars === null || stars === undefined || Number.isNaN(stars)) return null;
  return Math.max(0, Math.min(10, Math.round(stars * 2)));
}

/**
 * Minimum rating (on the 0-10 scale) for a watched film to count toward
 * the user's taste vector. Lives here so it can be referenced from a
 * single place if we ever expose it as a tunable.
 *
 * 4★ on Letterboxd = 8 on our scale.
 */
export const MIN_RATING_FOR_TASTE = 8;
