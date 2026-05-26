import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { QUEUE_NAMES } from "./queue-names";

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>("REDIS_HOST", "redis"),
          port: parseInt(config.get<string>("REDIS_PORT", "6379"), 10),
        },
      }),
    }),
    BullModule.registerQueue({ name: QUEUE_NAMES.SYNC_PROFILE }),
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
