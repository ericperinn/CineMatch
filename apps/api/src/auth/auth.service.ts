import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtPayload } from "./jwt.strategy";

const BCRYPT_ROUNDS = 12;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  letterboxdUsername: string | null;
  avatarUrl: string | null;
  notifyFriendRequests: boolean;
  notifySessionInvites: boolean;
  notifyMatches: boolean;
  createdAt: Date;
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email.toLowerCase() },
          ...(dto.letterboxdUsername ? [{ letterboxdUsername: dto.letterboxdUsername }] : []),
        ],
      },
      select: { email: true, letterboxdUsername: true },
    });

    if (existing) {
      const field = existing.email === dto.email.toLowerCase() ? "email" : "letterboxdUsername";
      throw new ConflictException(`${field} already in use`);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        letterboxdUsername: dto.letterboxdUsername ?? null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        letterboxdUsername: true,
        avatarUrl: true,
        notifyFriendRequests: true,
        notifySessionInvites: true,
        notifyMatches: true,
        createdAt: true,
      },
    });

    return { user, accessToken: this.signToken(user.id, user.email) };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const publicUser: PublicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      letterboxdUsername: user.letterboxdUsername,
      avatarUrl: user.avatarUrl,
      notifyFriendRequests: user.notifyFriendRequests,
      notifySessionInvites: user.notifySessionInvites,
      notifyMatches: user.notifyMatches,
      createdAt: user.createdAt,
    };

    return { user: publicUser, accessToken: this.signToken(user.id, user.email) };
  }

  private signToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwt.sign(payload, {
      expiresIn: this.config.get<string>("JWT_EXPIRES_IN", "7d"),
    });
  }
}
