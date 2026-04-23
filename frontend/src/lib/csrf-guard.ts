import { NextRequest, NextResponse } from 'next/server';

/**
 * CSRF defense-in-depth via Origin header validation.
 *
 * SameSite=Strict on the auth cookie is the primary guard; this is a
 * secondary layer that rejects cross-origin POST requests before any
 * business logic runs.
 *
 * Configure allowed origins with the ALLOWED_ORIGINS env var (comma-separated).
 * Defaults to http://localhost:3000 when unset (dev).
 *
 * Requests with no Origin header are passed through — they originate from
 * non-browser clients or same-origin navigation where the browser omits Origin.
 */
function getAllowedOrigins(): Set<string> {
  const raw = process.env.ALLOWED_ORIGINS;
  if (raw) {
    return new Set(raw.split(',').map((o) => o.trim()).filter(Boolean));
  }
  return new Set(['http://localhost:3000']);
}

/**
 * Returns a 403 NextResponse if the request carries a cross-origin Origin
 * header, or null if the request should proceed.
 */
export function checkOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin');
  if (!origin) return null;

  if (!getAllowedOrigins().has(origin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
