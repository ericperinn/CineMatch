import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import * as crypto from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { JwtPayload } from "./jwt.strategy";

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    // Always respond OK from the controller — but only actually send if the
    // email exists. Anything else leaks account existence.
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      this.logger.log(`[forgot-password] silent no-op for ${dto.email}`);
      return;
    }

    const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    // Invalidate any unused tokens this user already has — only one valid
    // link per user at a time.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const resetUrl = this.buildResetUrl(rawToken);
    await this.email.sendPasswordReset(
      { name: user.name, email: user.email },
      resetUrl,
    );
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = sha256(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("This reset link is invalid or expired");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Atomically update the password and mark the token used so a token can
    // only ever change one password.
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  private buildResetUrl(rawToken: string): string {
    const base = this.config.get<string>("APP_DEEP_LINK_BASE") ?? "cinematch://reset-password";
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}token=${encodeURIComponent(rawToken)}`;
  }

  private signToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwt.sign(payload, {
      expiresIn: this.config.get<string>("JWT_EXPIRES_IN", "7d"),
    });
  }
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
