import { IsEmail, IsOptional, IsString, MinLength, MaxLength, Matches } from "class-validator";

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{1,30}$/, {
    message: "letterboxdUsername must be 1-30 alphanumeric chars, underscores or hyphens",
  })
  letterboxdUsername?: string;
}
