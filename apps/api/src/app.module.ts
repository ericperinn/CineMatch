import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { FriendsModule } from "./friends/friends.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfileModule } from "./profile/profile.module";
import { UsersModule } from "./users/users.module";
import { MatchModule } from "./match/match.module";
import { SessionsModule } from "./sessions/sessions.module";
import { PushModule } from "./push/push.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      ignoreEnvFile: process.env.NODE_ENV === "production",
    }),
    // Rate limiter disabled for dev. Re-add ThrottlerModule.forRoot([...]) and
    // the APP_GUARD provider below when getting close to production.
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    FriendsModule,
    ProfileModule,
    MatchModule,
    SessionsModule,
    PushModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
