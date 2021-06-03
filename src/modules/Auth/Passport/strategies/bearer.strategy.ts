import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt } from "passport-jwt";
import { Strategy } from "passport-http-bearer";
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import axios from "axios";
import { ObjectId } from "mongodb";

@Injectable()
export class BearerStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, token: string, done: any): Promise<any> {
    try {
      // call remote api to get User by token
      const currentUserResponse = await axios(
        `${process.env.API_ACCOUNT}/api/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // if remote api call fails, throw error
      if (
        currentUserResponse.status !== 200 ||
        !currentUserResponse.data?.payload
      ) {
        throw new NotFoundException({
          code: "data__not_exists",
          payload: {
            key: "key_user",
          },
        });
      }

      // extract current user
      const currentUser = currentUserResponse.data.payload;
      // return current user with _id as ObjectId
      return done(null, { ...currentUser, _id: new ObjectId(currentUser._id) });
    } catch (error) {
      // something went wrong, just return unauthorized
      return done(
        new UnauthorizedException({ code: "err_unauthorized" }),
        false
      );
    }
  }
}
