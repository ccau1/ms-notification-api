import { Transform } from "class-transformer";
import { IsOptional, IsString, IsDate, IsBoolean } from "class-validator";
import transformBoolean from "../classTransformers/transformBoolean";
import { PaginateModel } from "./PaginateModel";

export class BaseSearchModel extends PaginateModel {
  @IsOptional()
  @IsString({ each: true })
  _ids?: string[];

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  onlyId?: string | boolean;

  @IsOptional()
  populates?: string[];

  @IsOptional()
  @IsDate()
  dateFr?: Date;

  @IsOptional()
  @IsDate()
  dateTo?: Date;

  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  paginate?: string | boolean;
}
