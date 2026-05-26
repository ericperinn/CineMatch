import { Body, Controller, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UpdateMeDto } from "./dto/update-me.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch("me")
  @ApiOperation({ summary: "Update the authenticated user's profile" })
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    const updated = await this.usersService.updateMe(user.id, dto);
    return { user: updated };
  }
}
