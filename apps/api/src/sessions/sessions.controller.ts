import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SessionsService } from "./sessions.service";

@ApiTags("sessions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("sessions")
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get("history")
  @ApiOperation({ summary: "List completed and abandoned sessions for the current user" })
  history(@CurrentUser() user: AuthenticatedUser) {
    return this.sessions.listHistory(user.id);
  }
}
