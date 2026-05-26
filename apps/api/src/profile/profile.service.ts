import { InjectQueue } from "@nestjs/bull";
import { BadRequestException, Injectable } from "@nestjs/common";
import { TasteSource } from "@prisma/client";
import { Queue } from "bull";
import { PrismaService } from "../prisma/prisma.service";
import { QUEUE_NAMES, SyncProfileJob } from "./queue-names";

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.SYNC_PROFILE)
    private readonly syncQueue: Queue<SyncProfileJob>,
  ) {}

  async dispatchSync(userId: string): Promise<{ jobId: string; queued: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { letterboxdUsername: true },
    });

    if (!user?.letterboxdUsername) {
      throw new BadRequestException("Connect a Letterboxd username before syncing");
    }

    // Idempotent: if a sync is already pending/active, reuse it.
    // If it's in a terminal state (completed/failed), drop it so we can re-queue.
    const jobId = `sync-profile:${userId}`;
    const existing = await this.syncQueue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (["waiting", "active", "delayed"].includes(state)) {
        return { jobId, queued: false };
      }
      await existing.remove();
    }

    await this.syncQueue.add(
      { userId },
      { jobId, removeOnComplete: 50, removeOnFail: 50, attempts: 3, backoff: { type: "exponential", delay: 30_000 } },
    );

    return { jobId, queued: true };
  }

  async getStatus(userId: string) {
    const [user, tasteCount, watchlistCount, lastTaste] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { letterboxdUsername: true },
      }),
      this.prisma.userMovieTaste.count({ where: { userId } }),
      this.prisma.watchlistItem.count({ where: { userId } }),
      this.prisma.userMovieTaste.findFirst({
        where: { userId },
        orderBy: { importedAt: "desc" },
        select: { importedAt: true },
      }),
    ]);

    const jobId = `sync-profile:${userId}`;
    const existing = await this.syncQueue.getJob(jobId);
    const jobState = existing ? await existing.getState() : null;

    return {
      letterboxdUsername: user?.letterboxdUsername ?? null,
      lastSyncedAt: lastTaste?.importedAt ?? null,
      tasteCount,
      watchlistCount,
      tasteByFavorites: await this.prisma.userMovieTaste.count({
        where: { userId, source: TasteSource.FAVORITE },
      }),
      tasteByDiary: await this.prisma.userMovieTaste.count({
        where: { userId, source: TasteSource.DIARY },
      }),
      currentSync: jobState ? { jobId, state: jobState } : null,
    };
  }
}
