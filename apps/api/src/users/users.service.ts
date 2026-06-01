import { ConflictException, Injectable } from "@nestjs/common";
import { FriendshipStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateMeDto } from "./dto/update-me.dto";

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

      let relationship: FriendshipRelation = "none";
      if (link) {
        if (link.status === FriendshipStatus.ACCEPTED) {
          relationship = "friends";
        } else if (link.userId === meId) {
          relationship = "pending_sent";
        } else {
          relationship = "pending_received";
        }
      }

      return {
        ...user,
        relationship,
        friendshipId: link?.id ?? null,
      };
    });
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
        select: {
          id: true,
          name: true,
          email: true,
          letterboxdUsername: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = (err.meta?.target as string[] | undefined)?.[0] ?? "field";
        throw new ConflictException(`${target} already in use`);
      }
      throw err;
    }
  }
}
