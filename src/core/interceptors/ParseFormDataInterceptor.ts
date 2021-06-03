import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";

@Injectable()
export class ParseFormDataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Get http context request
    const httpContextRequest = context.switchToHttp().getRequest();
    // if http context request found
    if (httpContextRequest) {
      // go through each field in the body and attempt to parse it
      httpContextRequest.body = Object.keys(httpContextRequest.body).reduce(
        (newBody, bodyKey) => {
          try {
            // try to parse this body field
            newBody[bodyKey] = JSON.parse(httpContextRequest.body[bodyKey]);
          } catch (err) {
            // if body field not array or obj, just add original field
            newBody[bodyKey] = httpContextRequest.body[bodyKey];
          }
          return newBody;
        },
        {}
      );
    }

    return next.handle();
  }
}
