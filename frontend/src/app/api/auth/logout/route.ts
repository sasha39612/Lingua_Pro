import { NextRequest, NextResponse } from 'next/server';
import { checkOrigin } from '@/lib/csrf-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const originError = checkOrigin(req);
  if (originError) return originError;

  const isHttps = req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:';
  const response = NextResponse.json({ ok: true });
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}
