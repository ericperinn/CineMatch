import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { MlClient } from "../../ml/ml.client";
import { PrismaService } from "../../prisma/prisma.service";
import { QUEUE_NAMES, EmbedMovieJob } from "../../queues/queue-names";

@Processor(QUEUE_NAMES.EMBED_MOVIE)
export class EmbedMovieProcessor {
  private readonly logger = new Logger(EmbedMovieProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ml: MlClient,
  ) {}

  @Process()
  async handle(job: Job<EmbedMovieJob>) {
    const { movieId } = job.data;

    const movie = await this.prisma.movie.findUnique({
      where: { id: movieId },
      select: { id: true, title: true, year: true, overview: true, embeddingUpdatedAt: true },
    });

    if (!movie) {
      this.logger.warn(`embed-movie: movie ${movieId} not found`);
      return { skipped: true, reason: "not_found" };
    }

    if (!movie.overview || movie.overview.trim().length === 0) {
      this.logger.warn(`embed-movie: movie ${movieId} has empty overview`);
      return { skipped: true, reason: "empty_overview" };
    }

    if (movie.title.startsWith("[pending]")) {
      this.logger.warn(`embed-movie: movie ${movieId} not yet hydrated, skipping`);
      return { skipped: true, reason: "not_hydrated" };
    }

    // Compose the text. Title and year provide grounding; overview carries the semantic load.
    const text = `${movie.title}. ${movie.year}. ${movie.overview}`;

    const { embeddings, dim } = await this.ml.embed([text]);
    if (embeddings.length !== 1 || embeddings[0].length !== dim) {
      throw new Error(`ML returned malformed payload for ${movieId}`);
    }

    // pgvector accepts the SQL literal '[v1,v2,...]'::vector. We have to use raw SQL
    // because Prisma marks the column as Unsupported.
    const vectorLiteral = `[${embeddings[0].join(",")}]`;
    await this.prisma.$executeRawUnsafe(
      `UPDATE movies SET embedding = $1::vector, "embeddingUpdatedAt" = NOW() WHERE id = $2`,
      vectorLiteral,
      movieId,
    );

    return { ok: true, dim };
  }
}
