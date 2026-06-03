import { IsIn, IsString, MaxLength } from "class-validator";

export class RegisterTokenDto {
  @IsString()
  @MaxLength(200)
  token!: string;

  @IsIn(["ios", "android", "web"])
  platform!: "ios" | "android" | "web";
}
