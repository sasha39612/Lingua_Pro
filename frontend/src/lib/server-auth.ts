import { NextRequest } from 'next/server';
import * as jwt from 'jsonwebtoken';

/**
 * Extract the JWT from the incoming Next.js server request.
 * Priority: httpOnly cookie "auth-token" → Authorization header fallback.
 * The cookie path is the canonical source after Phase 3; the header fallback
 * keeps server-to-server calls (e.g. admin proxy) working.
 */
export function getAuthToken(req: NextRequest): string | null {
  const cookie = req.cookies.get('auth-token')?.value;
  if (cookie) return cookie;

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  return null;
}

/**
 * Verify JWT signature and return payload. Returns null if the token is
 * missing, the signature is invalid, or JWT_SECRET is not configured.
 * Never use a plain base64 decode here — the payload is unsigned and forgeable
 * without signature verification.
 */
export function verifyAdminJwt(token: string): { role?: string; id?: string } | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    return jwt.verify(token, secret, { algorithms: ['HS256'] }) as { role?: string; id?: string };
  } catch {
    return null;
  }
}
