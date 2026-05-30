import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { FriendsModule } from "./friends/friends.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfileModule } from "./profile/profile.module";
import { UsersModule } from "./users/users.module";
import { MatchModule } from "./match/match.module";
import { SessionsModule } from "./sessions/sessions.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      ignoreEnvFile: process.env.NODE_ENV === "production",
    }),
    ThrottlerModule.forRoot([
      // Default: 300 req/min per IP. Generous for dev with mobile polling
      // (friends/pending every 15s) and multi-device testing.
      { name: "default", ttl: 60_000, limit: 300 },
      // Strict bucket — opt-in per endpoint with @Throttle({ strict: ... })
      { name: "strict", ttl: 60_000, limit: 5 },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    FriendsModule,
    ProfileModule,
    MatchModule,
    SessionsModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
