/// <reference types="node" />
import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[startup] Required env var ${name} is not set`);
  return v;
}

const JWT_SECRET = requireEnv('JWT_SECRET');

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
  async extractContext(req: any): Promise<AuthContext> {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const context: AuthContext = {};

    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        try {
          const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;

          context.userId = payload.sub || payload.id;
          context.user = payload;
          context.token = token; // pass token to subgraphs via headers
          return context;
        } catch (err) {
          // Invalid token: keep context empty so public operations still work.
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error('JWT validation failed:', errMsg);
        }
      }
    }
    return context;
  }
}
