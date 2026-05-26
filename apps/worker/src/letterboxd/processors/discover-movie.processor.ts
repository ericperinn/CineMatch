import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { PrismaService } from "../../prisma/prisma.service";
import { QUEUE_NAMES, DiscoverMovieJob } from "../../queues/queue-names";
import { TmdbClient } from "../../tmdb/tmdb.client";

@Processor(QUEUE_NAMES.DISCOVER_MOVIE)
export class DiscoverMovieProcessor {
  private readonly logger = new Logger(DiscoverMovieProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdb: TmdbClient,
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

    // TODO(phase-5): enqueue embed-movie here once SBERT is real

    return { ok: true, title: movie.title, year };
  }
}
