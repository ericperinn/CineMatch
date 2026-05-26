import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SendRequestDto } from "./dto/send-request.dto";
import { FriendsService } from "./friends.service";

@ApiTags("friends")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("friends")
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  @ApiOperation({ summary: "List accepted friendships" })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.friendsService.listAccepted(user.id);
  }

  @Get("pending")
  @ApiOperation({ summary: "List incoming friend requests" })
  pending(@CurrentUser() user: AuthenticatedUser) {
    return this.friendsService.listPending(user.id);
  }

  @Post("request")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Send a friend request to another user" })
  request(@CurrentUser() user: AuthenticatedUser, @Body() dto: SendRequestDto) {
    return this.friendsService.sendRequest(user.id, dto.targetId);
  }

  @Post(":id/accept")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Accept an incoming friend request" })
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) friendshipId: string,
  ) {
    return this.friendsService.accept(user.id, friendshipId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Cancel a request or remove a friendship" })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) friendshipId: string,
  ) {
    await this.friendsService.remove(user.id, friendshipId);
  }
}
