import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard as NestAuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
// tslint:disable-next-line
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';

export interface AuthGuardOptions {
  optional?: boolean;
  type?: string;
}

export const AuthGuard = (options?: AuthGuardOptions) => {
  const MixinJwtAuthGuard = class MixinJwtAuthGuard extends NestAuthGuard(
    options?.type || 'bearer',
  ) {
    constructor(options: AuthGuardOptions) {
      super();
      this.options = options;
    }
    public options;

    canActivate(context: ExecutionContext) {
      let finalContext = context;
      try {
        const ctx = GqlExecutionContext.create(context);
        const graphQlCtx = ctx.getContext();
        if (graphQlCtx && graphQlCtx.req) {
          finalContext = new ExecutionContextHost([graphQlCtx.req]);
        }
      } catch (error) {
        console.error(error);
      }
      return super.canActivate(finalContext);
    }

    handleRequest(err, user) {
      if (!this.options?.optional) {
        if (err || !user) {
          throw err || new UnauthorizedException();
        }
      }
      return user;
    }
  };
  return new MixinJwtAuthGuard(options);
};
