import { IsBoolean, IsOptional } from "class-validator";

export class UpdateNotificationsDto {
  @IsOptional()
  @IsBoolean()
  notifyFriendRequests?: boolean;

  @IsOptional()
  @IsBoolean()
  notifySessionInvites?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyMatches?: boolean;
}
