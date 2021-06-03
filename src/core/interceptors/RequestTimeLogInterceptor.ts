import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RequestTimeLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const thisContext = context.switchToHttp().getRequest();

    const now = Date.now();
    return next
      .handle()
      .pipe(
        tap(() =>
          console.info(
            `[ ${thisContext['method']} ${
              thisContext['url']
            } ] completion time: ${Date.now() - now}ms`,
          ),
        ),
      );
  }
}
