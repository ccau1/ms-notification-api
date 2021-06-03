import { Transform } from "class-transformer";
import { IsOptional, IsBoolean, IsNumber, IsString } from "class-validator";
import transformBoolean from "../classTransformers/transformBoolean";
import transformNumber from "../classTransformers/transformNumber";

export class PaginateModel {
  @IsOptional()
  @IsNumber()
  @Transform(transformNumber)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Transform(transformNumber)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Transform(transformNumber)
  offset?: number;

  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  paginate?: string | boolean;

  @IsOptional()
  @IsString()
  sort?: string;
}
