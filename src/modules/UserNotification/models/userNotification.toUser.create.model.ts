import { User } from "src/modules/Auth/interfaces/user";

export class UserNotificationToUserCreateModel {
  user?: User | string;
  read?: boolean;
  email?: string;
  phone?: string;
  phoneRegionCode?: string;
  language?: string;
}
