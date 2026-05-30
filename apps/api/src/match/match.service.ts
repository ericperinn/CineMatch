import { Injectable, Logger } from "@nestjs/common";
import { SessionMode, SessionStatus, VoteType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { matchConfig } from "../config/match.config";

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createSession(hostId: string, guestId: string, mode: SessionMode) {
    return this.prisma.matchSession.create({
      data: {
        hostId,
        guestId,
        mode,
        status: SessionStatus.IN_PROGRESS,
      },
      include: {
        host: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async joinSession(sessionId: string, guestId: string) {
    const session = await this.prisma.matchSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new Error("Session not found");
    }
    if (session.guestId !== guestId) {
      throw new Error("Unauthorized to join this session");
    }
    return session;
  }

  async abandonSession(sessionId: string) {
    const session = await this.prisma.matchSession.findUnique({
      where: { id: sessionId },
    });
    if (session && session.status === SessionStatus.IN_PROGRESS) {
      await this.prisma.matchSession.update({
        where: { id: sessionId },
        data: { status: SessionStatus.ABANDONED, finishedAt: new Date() },
      });
    }
  }

  /**
   * Computes a user's taste vector based on their favorites and recent high-rated diary entries.
   * Returns a 384-element float array, or null if no data is available.
   */
  async computeTasteVector(userId: string): Promise<number[] | null> {
    const results = await this.prisma.$queryRawUnsafe<Array<{
      source: string;
      embedding_str: string;
    }>>(`
      SELECT
        t.source,
        m.embedding::text AS embedding_str
      FROM user_movie_tastes t
      JOIN movies m ON t."movieId" = m.id
      WHERE t."userId" = $1
        AND m.embedding IS NOT NULL
      ORDER BY t.source ASC, t."watchedAt" DESC NULLS LAST
    `, userId);

    if (results.length === 0) {
      return null;
    }

    let totalWeight = 0;
    const vector = new Array(384).fill(0);
    let diaryCount = 0;

    for (const row of results) {
      let weight = 0;
      if (row.source === "FAVORITE") {
        weight = matchConfig.FAVORITE_WEIGHT;
      } else if (row.source === "DIARY") {
        if (diaryCount >= matchConfig.RECENCY_BIAS_WINDOW) continue;
        weight = matchConfig.DIARY_WEIGHT;
        diaryCount++;
      }

      if (weight > 0) {
        // Parse the vector string '[0.1, 0.2, ...]'
        const str = row.embedding_str;
        const vals = str.substring(1, str.length - 1).split(',').map(Number);
        
        if (vals.length === 384) {
          for (let i = 0; i < 384; i++) {
            vector[i] += vals[i] * weight;
          }
          totalWeight += weight;
        }
      }
    }

    if (totalWeight === 0) return null;

    // Normalize
    for (let i = 0; i < 384; i++) {
      vector[i] /= totalWeight;
    }

    return vector;
  }

  getMeetingPoint(hostVector: number[] | null, guestVector: number[] | null): number[] | null {
    if (hostVector && guestVector) {
      return hostVector.map((v, i) => (v + guestVector[i]) / 2);
    }
    if (hostVector) return hostVector;
    if (guestVector) return guestVector;
    return null;
  }

  async getNextBatch(sessionId: string, k: number = matchConfig.BATCH_SIZE) {
    const session = await this.prisma.matchSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new Error("Session not found");

    const hostVector = await this.computeTasteVector(session.hostId);
    const guestVector = await this.computeTasteVector(session.guestId);
    const meetingPoint = this.getMeetingPoint(hostVector, guestVector);

    let movies: any[] = [];

    if (!meetingPoint) {
      // Cold start: fallback to recent/popular movies if no taste vector
      movies = await this.prisma.$queryRawUnsafe(`
        SELECT id, title, year, "posterPath", 1 as distance
        FROM movies
        WHERE id NOT IN (
          SELECT "movieId" FROM swipes WHERE "sessionId" = $1
        )
        AND "embeddingUpdatedAt" IS NOT NULL
        ORDER BY year DESC
        LIMIT $2
      `, sessionId, k);
      return movies;
    }

    const vectorLiteral = `[${meetingPoint.join(",")}]`;

    if (session.mode === SessionMode.DISCOVERY) {
      movies = await this.prisma.$queryRawUnsafe(`
        SELECT m.id, m.title, m.year, m."posterPath",
               m.embedding <=> $1::vector AS distance
        FROM movies m
        WHERE m.embedding IS NOT NULL
          AND m.id NOT IN (
            SELECT "movieId" FROM swipes WHERE "sessionId" = $2
          )
          AND m.id NOT IN (
            SELECT "movieId" FROM dislike_cooldowns
            WHERE "userId" IN ($3, $4)
              AND "expiresAt" > NOW()
          )
          AND m.id NOT IN (
            SELECT "movieId" FROM user_movie_tastes
            WHERE "userId" IN ($3, $4)
              AND source = 'DIARY'
          )
        ORDER BY distance ASC
        LIMIT $5
      `, vectorLiteral, sessionId, session.hostId, session.guestId, k);
    } else {
      // WATCHLIST mode - intersection
      movies = await this.prisma.$queryRawUnsafe(`
        WITH intersection AS (
          SELECT "movieId" FROM watchlist_items WHERE "userId" = $3
          INTERSECT
          SELECT "movieId" FROM watchlist_items WHERE "userId" = $4
        )
        SELECT m.id, m.title, m.year, m."posterPath",
               m.embedding <=> $1::vector AS distance
        FROM movies m
        JOIN intersection i ON m.id = i."movieId"
        WHERE m.embedding IS NOT NULL
          AND m.id NOT IN (
            SELECT "movieId" FROM swipes WHERE "sessionId" = $2
          )
          AND m.id NOT IN (
            SELECT "movieId" FROM dislike_cooldowns
            WHERE "userId" IN ($3, $4)
              AND "expiresAt" > NOW()
          )
        ORDER BY distance ASC
        LIMIT $5
      `, vectorLiteral, sessionId, session.hostId, session.guestId, k);
    }

    return movies;
  }

  async handleSwipe(sessionId: string, userId: string, movieId: string, vote: VoteType) {
    const session = await this.prisma.matchSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new Error("Session not found");

    await this.prisma.swipe.upsert({
      where: { sessionId_userId_movieId: { sessionId, userId, movieId } },
      create: { sessionId, userId, movieId, vote },
      update: { vote },
    });

    if (vote === VoteType.DISLIKE) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + matchConfig.DISLIKE_COOLDOWN_DAYS);
      await this.prisma.dislikeCooldown.upsert({
        where: { userId_movieId: { userId, movieId } },
        create: { userId, movieId, expiresAt },
        update: { expiresAt },
      });
      return { match: false, isCompleted: false };
    }

    // It's a LIKE. Check if mutual
    const otherUserId = session.hostId === userId ? session.guestId : session.hostId;
    const mutual = await this.prisma.swipe.findFirst({
      where: { sessionId, userId: otherUserId, movieId, vote: VoteType.LIKE },
    });

    if (!mutual) return { match: false, isCompleted: false };

    // Mutual match
    const currentMatches = await this.prisma.swipe.groupBy({
      by: ['movieId'],
      where: { sessionId, vote: VoteType.LIKE },
      having: {
        movieId: {
          _count: { equals: 2 }
        }
      }
    });

    const matchCount = currentMatches.length;
    const isCompleted = matchCount >= matchConfig.PODIUM_SIZE;

    if (isCompleted) {
      await this.prisma.matchSession.update({
        where: { id: sessionId },
        data: { status: SessionStatus.COMPLETED, finishedAt: new Date() },
      });
    }

    const movie = await this.prisma.movie.findUnique({
      where: { id: movieId },
      select: { id: true, title: true, year: true, overview: true, posterPath: true },
    });

    return {
      match: true,
      movie,
      currentCount: matchCount,
      podiumSize: matchConfig.PODIUM_SIZE,
      isCompleted,
    };
  }

  async getPodium(sessionId: string) {
    const mutualLikes = await this.prisma.$queryRawUnsafe<Array<{ movieId: string }>>(`
      SELECT "movieId" FROM swipes
      WHERE "sessionId" = $1 AND vote = 'LIKE'
      GROUP BY "movieId"
      HAVING COUNT(*) = 2
    `, sessionId);

    if (mutualLikes.length === 0) return [];

    const movieIds = mutualLikes.map(m => m.movieId);
    return this.prisma.movie.findMany({
      where: { id: { in: movieIds } },
      select: { id: true, title: true, year: true, overview: true, posterPath: true },
    });
  }
}
