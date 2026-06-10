import { ConflictException, Injectable } from "@nestjs/common";
import { FriendshipStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateMeDto } from "./dto/update-me.dto";
import { UpdateNotificationsDto } from "./dto/update-notifications.dto";

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  letterboxdUsername: true,
  avatarUrl: true,
  notifyFriendRequests: true,
  notifySessionInvites: true,
  notifyMatches: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type FriendshipRelation =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "friends";

export interface UserSearchResult {
  id: string;
  name: string;
  avatarUrl: string | null;
  relationship: FriendshipRelation;
  friendshipId: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async search(meId: string, rawQuery: string): Promise<UserSearchResult[]> {
    const term = rawQuery?.trim() ?? "";
    if (term.length < 2) return [];

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: meId },
        OR: [
          { email: { startsWith: term.toLowerCase() } },
          { name: { contains: term, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, avatarUrl: true },
      take: 10,
    });

    if (users.length === 0) return [];

    const ids = users.map((u) => u.id);
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { userId: meId, friendId: { in: ids } },
          { friendId: meId, userId: { in: ids } },
        ],
      },
      select: { id: true, status: true, userId: true, friendId: true },
    });

    return users.map((user) => {
      const link = friendships.find(
        (f) =>
          (f.userId === meId && f.friendId === user.id) ||
          (f.friendId === meId && f.userId === user.id),
      );
      return {
        ...user,
        ...this.deriveRelationship(meId, link),
      };
    });
  }

  async findById(meId: string, otherId: string): Promise<UserSearchResult | null> {
    if (otherId === meId) return null;

    const user = await this.prisma.user.findUnique({
      where: { id: otherId },
      select: { id: true, name: true, avatarUrl: true },
    });
    if (!user) return null;

    const link = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: meId, friendId: otherId },
          { friendId: meId, userId: otherId },
        ],
      },
      select: { id: true, status: true, userId: true, friendId: true },
    });

    return { ...user, ...this.deriveRelationship(meId, link ?? undefined) };
  }

  private deriveRelationship(
    meId: string,
    link: { id: string; status: string; userId: string } | undefined,
  ): { relationship: FriendshipRelation; friendshipId: string | null } {
    if (!link) return { relationship: "none", friendshipId: null };
    if (link.status === FriendshipStatus.ACCEPTED) {
      return { relationship: "friends", friendshipId: link.id };
    }
    return {
      relationship: link.userId === meId ? "pending_sent" : "pending_received",
      friendshipId: link.id,
    };
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
          ...(dto.letterboxdUsername !== undefined && { letterboxdUsername: dto.letterboxdUsername }),
        },
        select: PUBLIC_USER_SELECT,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = (err.meta?.target as string[] | undefined)?.[0] ?? "field";
        throw new ConflictException(`${target} already in use`);
      }
      throw err;
    }
  }

  async updateNotifications(userId: string, dto: UpdateNotificationsDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.notifyFriendRequests !== undefined && {
          notifyFriendRequests: dto.notifyFriendRequests,
        }),
        ...(dto.notifySessionInvites !== undefined && {
          notifySessionInvites: dto.notifySessionInvites,
        }),
        ...(dto.notifyMatches !== undefined && {
          notifyMatches: dto.notifyMatches,
        }),
      },
      select: PUBLIC_USER_SELECT,
    });
  }
}
