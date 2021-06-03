import { IsOptional, IsString } from "class-validator";

export class LocalizeModel {
  @IsOptional()
  @IsString()
  en?: string;
  @IsOptional()
  @IsString()
  "zh-hk"?: string;
  @IsOptional()
  @IsString()
  "zh-cn"?: string;
  @IsOptional()
  @IsString()
  _l?: string;
}
