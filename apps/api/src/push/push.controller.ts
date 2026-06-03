import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser, CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RegisterTokenDto } from "./dto/register-token.dto";
import { PushService } from "./push.service";

@ApiTags("push")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users/me/push-tokens")
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register an Expo push token for the current device" })
  async register(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterTokenDto,
  ) {
    await this.push.registerToken(user.id, dto.token, dto.platform);
    return { ok: true };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Unregister a push token (e.g. on logout)" })
  async unregister(@Body() body: { token: string }) {
    await this.push.unregisterToken(body.token);
  }
}
