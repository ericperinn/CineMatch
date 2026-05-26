import { IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from "class-validator";

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{1,30}$/, {
    message: "letterboxdUsername must be 1-30 alphanumeric chars, underscores or hyphens",
  })
  letterboxdUsername?: string;
}
