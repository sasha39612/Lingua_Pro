/// <reference types="node" />
import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface AuthContext {
  userId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    language: string;
  };
  token?: string;
}

@Injectable()
export class AuthContextService {
  /**
   * Extract and validate JWT from request headers
   * Attach user info to context for downstream resolvers
   */
  extractContext(req: any): AuthContext {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const context: AuthContext = {};

    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        try {
          const secret = process.env.JWT_SECRET || 'dev-secret';
          const payload = jwt.verify(token, secret) as any;
          context.userId = payload.sub || payload.id;
          context.user = payload;
          context.token = token; // pass token to subgraphs via headers
          return context;
        } catch (err) {
          // token invalid; context remains empty
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error('JWT validation failed:', errMsg);
        }
      }
    }
    return context;
  }
}
