import { InjectQueue, Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bull";
import { PrismaService } from "../../prisma/prisma.service";
import { QUEUE_NAMES, DiscoverMovieJob, EmbedMovieJob } from "../../queues/queue-names";
import { TmdbClient } from "../../tmdb/tmdb.client";

@Processor(QUEUE_NAMES.DISCOVER_MOVIE)
export class DiscoverMovieProcessor {
  private readonly logger = new Logger(DiscoverMovieProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdb: TmdbClient,
    @InjectQueue(QUEUE_NAMES.EMBED_MOVIE)
    private readonly embedQueue: Queue<EmbedMovieJob>,
  ) {}

  @Process()
  async handle(job: Job<DiscoverMovieJob>) {
    const { tmdbId } = job.data;

    if (!tmdbId) {
      this.logger.warn("discover-movie job without tmdbId — slug-only path not yet implemented");
      return { skipped: true };
    }

    if (!this.tmdb.enabled) {
      this.logger.warn(`Skipping discover for ${tmdbId} — TMDB_API_KEY not set`);
      return { skipped: true, reason: "no_tmdb_key" };
    }

    // Short-circuit if already hydrated. Cheaper than another TMDB call
    // and protects against duplicate enqueues from concurrent syncs.
    // Still enqueue embed-movie if the embedding is missing — this catches
    // movies hydrated before SBERT was added.
    const existing = await this.prisma.movie.findUnique({
      where: { id: tmdbId },
      select: { title: true, year: true, overview: true, embeddingUpdatedAt: true },
    });
    if (existing && !existing.title.startsWith("[pending]") && existing.year > 0) {
      if (!existing.embeddingUpdatedAt && existing.overview?.trim()) {
        await this.embedQueue.add(
          { movieId: tmdbId },
          { removeOnComplete: 200, removeOnFail: 50, attempts: 5, backoff: { type: "exponential", delay: 10_000 } },
        );
      }
      return { skipped: true, reason: "already_hydrated" };
    }

    const movie = await this.tmdb.getMovie(tmdbId);
    if (!movie) return { skipped: true, reason: "tmdb_404" };

    const year = movie.release_date
      ? parseInt(movie.release_date.slice(0, 4), 10) || 0
      : 0;

    await this.prisma.movie.upsert({
      where: { id: tmdbId },
      create: {
        id: tmdbId,
        title: movie.title || movie.original_title || `[unknown] ${tmdbId}`,
        year,
        overview: movie.overview ?? "",
        posterPath: movie.poster_path,
      },
      update: {
        title: movie.title || movie.original_title || `[unknown] ${tmdbId}`,
        year,
        overview: movie.overview ?? "",
        posterPath: movie.poster_path,
      },
    });

    // Enqueue embedding job — fire-and-forget. Skipped inside the processor
    // if the overview is empty.
    if (movie.overview && movie.overview.trim().length > 0) {
      await this.embedQueue.add(
        { movieId: tmdbId },
        { removeOnComplete: 200, removeOnFail: 50, attempts: 5, backoff: { type: "exponential", delay: 10_000 } },
      );
    }

    return { ok: true, title: movie.title, year };
  }
}
