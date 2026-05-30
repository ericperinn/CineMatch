import { InjectQueue, Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { TasteSource } from "@prisma/client";
import { Job, Queue } from "bull";
import { PrismaService } from "../../prisma/prisma.service";
import { QUEUE_NAMES, SyncProfileJob, DiscoverMovieJob } from "../../queues/queue-names";
import { DiaryFetcher } from "../fetchers/diary.fetcher";
import { MoviePageFetcher } from "../fetchers/movie-page.fetcher";
import { ProfileFetcher } from "../fetchers/profile.fetcher";
import { WatchlistFetcher } from "../fetchers/watchlist.fetcher";
import { MIN_RATING_FOR_TASTE } from "../rating-converter";

@Processor(QUEUE_NAMES.SYNC_PROFILE)
export class SyncProfileProcessor {
  private readonly logger = new Logger(SyncProfileProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly diary: DiaryFetcher,
    private readonly profile: ProfileFetcher,
    private readonly watchlist: WatchlistFetcher,
    private readonly moviePage: MoviePageFetcher,
    @InjectQueue(QUEUE_NAMES.DISCOVER_MOVIE)
    private readonly discoverMovieQueue: Queue<DiscoverMovieJob>,
  ) {}

  @Process()
  async handle(job: Job<SyncProfileJob>) {
    const { userId } = job.data;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, letterboxdUsername: true },
    });

    if (!user) {
      this.logger.warn(`Sync requested for unknown user ${userId}`);
      return { skipped: true, reason: "user_not_found" };
    }
    if (!user.letterboxdUsername) {
      this.logger.warn(`User ${userId} has no Letterboxd username`);
      return { skipped: true, reason: "no_letterboxd_username" };
    }

    const username = user.letterboxdUsername;
    this.logger.log(`Syncing Letterboxd profile for ${username}`);

    const [diaryEntries, favorites, watchlistEntries] = await Promise.all([
      this.diary.fetch(username),
      this.profile.fetchFavorites(username),
      this.watchlist.fetchAll(username),
    ]);

    // Resolve favorite slugs → TMDB IDs (slugs come without IDs from the profile page)
    const favoritesWithTmdb = await Promise.all(
      favorites.map(async (fav) => {
        const info = await this.moviePage.resolveBySlug(fav.letterboxdSlug);
        return { slug: fav.letterboxdSlug, tmdbId: info.tmdbId };
      }),
    );

    // Resolve watchlist slugs → TMDB IDs
    const watchlistWithTmdb = await Promise.all(
      watchlistEntries.map(async (entry) => {
        const info = await this.moviePage.resolveBySlug(entry.letterboxdSlug);
        return { slug: entry.letterboxdSlug, tmdbId: info.tmdbId };
      }),
    );

    // Collect all unique TMDB IDs we touched, ensure Movie row stubs exist
    const allTmdbIds = new Set<string>();
    diaryEntries.forEach((d) => allTmdbIds.add(d.tmdbId));
    favoritesWithTmdb.forEach((f) => f.tmdbId && allTmdbIds.add(f.tmdbId));
    watchlistWithTmdb.forEach((w) => w.tmdbId && allTmdbIds.add(w.tmdbId));

    const movieIds = await this.ensureMovieStubs(Array.from(allTmdbIds));

    // Persist taste signals (favorites + high-rated diary)
    const highRatedDiary = diaryEntries.filter(
      (e) => e.ratingInt !== null && e.ratingInt >= MIN_RATING_FOR_TASTE,
    );

    const tasteOps: Promise<unknown>[] = [];

    for (const fav of favoritesWithTmdb) {
      if (!fav.tmdbId || !movieIds.has(fav.tmdbId)) continue;
      tasteOps.push(
        this.prisma.userMovieTaste.upsert({
          where: { userId_movieId_source: { userId, movieId: fav.tmdbId, source: TasteSource.FAVORITE } },
          create: { userId, movieId: fav.tmdbId, source: TasteSource.FAVORITE, rating: 10 },
          update: { rating: 10, importedAt: new Date() },
        }),
      );
    }

    for (const entry of highRatedDiary.slice(0, 15)) {
      tasteOps.push(
        this.prisma.userMovieTaste.upsert({
          where: { userId_movieId_source: { userId, movieId: entry.tmdbId, source: TasteSource.DIARY } },
          create: {
            userId,
            movieId: entry.tmdbId,
            source: TasteSource.DIARY,
            rating: entry.ratingInt,
            watchedAt: entry.watchedAt,
          },
          update: { rating: entry.ratingInt, watchedAt: entry.watchedAt, importedAt: new Date() },
        }),
      );
    }

    // Replace watchlist (delete old + insert new — watchlist is a snapshot, not append-only)
    tasteOps.push(this.prisma.watchlistItem.deleteMany({ where: { userId } }));
    for (const entry of watchlistWithTmdb) {
      if (!entry.tmdbId || !movieIds.has(entry.tmdbId)) continue;
      tasteOps.push(
        this.prisma.watchlistItem.create({
          data: { userId, movieId: entry.tmdbId },
        }),
      );
    }

    await Promise.all(tasteOps);

    // Enqueue metadata discovery for movies that don't have metadata yet
    await this.enqueueDiscoverJobs(Array.from(movieIds));

    return {
      diaryCount: highRatedDiary.length,
      favoritesCount: favoritesWithTmdb.filter((f) => f.tmdbId).length,
      watchlistCount: watchlistWithTmdb.filter((w) => w.tmdbId).length,
    };
  }

  /**
   * Creates Movie rows for any TMDB IDs not yet in the catalogue.
   * The stubs have minimal data — metadata is filled by discover-movie.
   * Returns the set of IDs that now exist in the DB.
   */
  private async ensureMovieStubs(tmdbIds: string[]): Promise<Set<string>> {
    if (tmdbIds.length === 0) return new Set();

    const existing = await this.prisma.movie.findMany({
      where: { id: { in: tmdbIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((m) => m.id));

    const toCreate = tmdbIds.filter((id) => !existingIds.has(id));
    if (toCreate.length > 0) {
      await this.prisma.movie.createMany({
        data: toCreate.map((id) => ({
          id,
          title: `[pending] ${id}`,
          year: 0,
          overview: "",
        })),
        skipDuplicates: true,
      });
    }

    return new Set(tmdbIds);
  }

  private async enqueueDiscoverJobs(tmdbIds: string[]): Promise<void> {
    if (tmdbIds.length === 0) return;

    const needsWork = await this.prisma.movie.findMany({
      where: {
        id: { in: tmdbIds },
        OR: [
          { title: { startsWith: "[pending]" } },
          { year: 0 },
          { embeddingUpdatedAt: null },
        ],
      },
      select: { id: true },
    });

    for (const movie of needsWork) {
      await this.discoverMovieQueue.add(
        { tmdbId: movie.id },
        { removeOnComplete: 100, removeOnFail: 50, attempts: 3 },
      );
    }
  }
}
