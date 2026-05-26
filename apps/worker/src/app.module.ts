import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { LetterboxdModule } from "./letterboxd/letterboxd.module";
import { PrismaModule } from "./prisma/prisma.module";
import { TmdbModule } from "./tmdb/tmdb.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      ignoreEnvFile: process.env.NODE_ENV === "production",
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || "redis",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
      },
    }),
    PrismaModule,
    TmdbModule,
    LetterboxdModule,
  ],
})
export class AppModule {}
