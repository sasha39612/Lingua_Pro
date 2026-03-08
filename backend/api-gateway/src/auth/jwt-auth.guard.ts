import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const req = this.getRequest(context);
    if (!req) {
      return true;
    }

    const auth = req.headers['authorization'] || req.headers['Authorization'];
    if (!auth) {
      return true;
    }

    if (!auth || typeof auth !== 'string') {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid Authorization format');
    }

    const token = parts[1];
    try {
      const secret = process.env.JWT_SECRET || 'dev-secret';
      const payload = jwt.verify(token, secret);

      req.user = payload as any;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private getRequest(context: ExecutionContext): any {
    if (context.getType<'http' | 'graphql'>() === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context).getContext();
      return gqlCtx?.req;
    }

    return context.switchToHttp().getRequest();
  }
}
