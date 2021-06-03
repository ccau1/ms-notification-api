import { IsString, IsOptional } from "class-validator";
import { BaseSearchModel } from "src/core/mongo/BaseSearchModel";

export class UserNotificationSearchModel extends BaseSearchModel {
  @IsOptional()
  @IsString({ each: true })
  senders?: string[];

  @IsOptional()
  @IsString({ each: true })
  users?: string[];
}
