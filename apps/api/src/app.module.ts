import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      ignoreEnvFile: process.env.NODE_ENV === "production",
    }),
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
