import { Injectable } from "@nestjs/common";
import { SessionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface PartnerInfo {
  id: string;
  name: string;
  avatarUrl: string | null;
}

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listHistory(userId: string) {
    const sessions = await this.prisma.matchSession.findMany({
      where: {
        OR: [{ hostId: userId }, { guestId: userId }],
        status: { in: [SessionStatus.COMPLETED, SessionStatus.ABANDONED] },
      },
      include: {
        host: { select: { id: true, name: true, avatarUrl: true } },
        guest: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: [{ finishedAt: "desc" }, { createdAt: "desc" }],
      take: 30,
    });

    if (sessions.length === 0) return [];

    // Pull mutual likes (podium) for COMPLETED sessions in a single round trip.
    const completedIds = sessions
      .filter((s) => s.status === SessionStatus.COMPLETED)
      .map((s) => s.id);

    const podiumsBySession = new Map<string, Array<{ id: string; title: string; year: number | null; posterPath: string | null }>>();

    if (completedIds.length > 0) {
      const mutualLikes = await this.prisma.$queryRawUnsafe<Array<{ sessionId: string; movieId: string }>>(
        `
        SELECT "sessionId", "movieId"
        FROM swipes
        WHERE "sessionId" = ANY($1::uuid[]) AND vote = 'LIKE'
        GROUP BY "sessionId", "movieId"
        HAVING COUNT(*) = 2
        `,
        completedIds,
      );

      const movieIds = [...new Set(mutualLikes.map((r) => r.movieId))];
      const movies = movieIds.length
        ? await this.prisma.movie.findMany({
            where: { id: { in: movieIds } },
            select: { id: true, title: true, year: true, posterPath: true },
          })
        : [];
      const movieById = new Map(movies.map((m) => [m.id, m]));

      for (const row of mutualLikes) {
        const movie = movieById.get(row.movieId);
        if (!movie) continue;
        const list = podiumsBySession.get(row.sessionId) ?? [];
        list.push(movie);
        podiumsBySession.set(row.sessionId, list);
      }
    }

    return sessions.map((session) => {
      const partner: PartnerInfo = session.hostId === userId ? session.guest : session.host;
      return {
        id: session.id,
        mode: session.mode,
        status: session.status,
        createdAt: session.createdAt,
        finishedAt: session.finishedAt,
        role: session.hostId === userId ? ("host" as const) : ("guest" as const),
        partner,
        podium: podiumsBySession.get(session.id) ?? [],
      };
    });
  }
}
