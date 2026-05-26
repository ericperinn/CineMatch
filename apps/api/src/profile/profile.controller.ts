import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ProfileService } from "./profile.service";

@ApiTags("profile")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post("letterboxd/sync")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Trigger a Letterboxd profile sync job" })
  sync(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.dispatchSync(user.id);
  }

  @Get("letterboxd/status")
  @ApiOperation({ summary: "Letterboxd sync status and current taste signal counts" })
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getStatus(user.id);
  }
}
