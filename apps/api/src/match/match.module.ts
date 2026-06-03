import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PushModule } from "../push/push.module";
import { MatchGateway } from "./match.gateway";
import { MatchService } from "./match.service";

@Module({
  imports: [AuthModule, PrismaModule, PushModule],
  providers: [MatchGateway, MatchService],
})
export class MatchModule {}
