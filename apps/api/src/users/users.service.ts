import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateMeDto } from "./dto/update-me.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
