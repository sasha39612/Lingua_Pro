import { NextRequest } from 'next/server';

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
