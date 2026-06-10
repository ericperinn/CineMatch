import { IsString, Length, MaxLength, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString()
  @Length(32, 128)
  token!: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @MaxLength(128)
  password!: string;
}
