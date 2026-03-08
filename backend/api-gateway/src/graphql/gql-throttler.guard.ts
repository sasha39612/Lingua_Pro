import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    if (context.getType<'graphql' | 'http'>() === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context).getContext();
      return {
        req: gqlCtx.req,
        res: gqlCtx.res,
      };
    }

    const httpCtx = context.switchToHttp();
    return {
      req: httpCtx.getRequest(),
      res: httpCtx.getResponse(),
    };
  }
}
