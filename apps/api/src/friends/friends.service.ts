import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FriendshipStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const friendSelect = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, avatarUrl: true } },
  friend: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.FriendshipSelect;

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAccepted(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ userId }, { friendId: userId }],
      },
      select: friendSelect,
      orderBy: { updatedAt: "desc" },
    });

    // Normalize: always return the *other* person as the friend.
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      since: row.updatedAt,
      friend: row.user.id === userId ? row.friend : row.user,
    }));
  }

  async listPending(userId: string) {
    return this.prisma.friendship.findMany({
      where: { friendId: userId, status: FriendshipStatus.PENDING },
      select: friendSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  async sendRequest(senderId: string, targetId: string) {
    if (senderId === targetId) {
      throw new BadRequestException("You cannot send a friend request to yourself");
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException("Target user not found");
    }

    // Conflict: already a request in either direction
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId: targetId },
          { userId: targetId, friendId: senderId },
        ],
      },
      select: { id: true, status: true, userId: true },
    });

    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new ConflictException("Already friends");
      }
      if (existing.userId === senderId) {
        throw new ConflictException("Friend request already sent");
      }
      throw new ConflictException(
        "This user already sent you a friend request — accept that one instead",
      );
    }

    return this.prisma.friendship.create({
      data: { userId: senderId, friendId: targetId, status: FriendshipStatus.PENDING },
      select: friendSelect,
    });
  }

  async accept(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
      select: { id: true, friendId: true, status: true },
    });

    if (!friendship) {
      throw new NotFoundException("Friend request not found");
    }
    if (friendship.friendId !== userId) {
      throw new ForbiddenException("Only the recipient can accept this request");
    }
    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new ConflictException(`Cannot accept a friendship that is ${friendship.status}`);
    }

    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: FriendshipStatus.ACCEPTED },
      select: friendSelect,
    });
  }

  async remove(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
      select: { userId: true, friendId: true },
    });

    if (!friendship) {
      throw new NotFoundException("Friendship not found");
    }
    if (friendship.userId !== userId && friendship.friendId !== userId) {
      throw new ForbiddenException("You are not part of this friendship");
    }

    await this.prisma.friendship.delete({ where: { id: friendshipId } });
  }
}
