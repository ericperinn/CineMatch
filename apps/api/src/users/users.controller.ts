import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
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

  @Get("search")
  @ApiOperation({ summary: "Search users by email or name" })
  @ApiQuery({ name: "q", required: true, description: "Search term, min 2 chars" })
  search(@CurrentUser() user: AuthenticatedUser, @Query("q") q: string) {
    return this.usersService.search(user.id, q ?? "");
  }

  @Get(":id")
  @ApiOperation({ summary: "Look up a user by id (used by share-invite deep links)" })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    const result = await this.usersService.findById(user.id, id);
    if (!result) throw new NotFoundException("User not found");
    return result;
  }
}
