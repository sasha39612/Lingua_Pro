import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { verifyToken } from '../../../auth-service/src/graphql/auth.schema';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'] || req.headers['Authorization'];
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
      // check session store via helper; throws if revoked
      await verifyToken(token);
      req.user = payload as any;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
