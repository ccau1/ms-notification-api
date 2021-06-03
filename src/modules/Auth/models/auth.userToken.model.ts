export interface AuthUserTokenModel {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresOn: number;
}
