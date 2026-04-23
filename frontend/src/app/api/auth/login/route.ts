import { NextRequest, NextResponse } from 'next/server';
import { GRAPHQL_OPERATIONS } from '@/lib/graphql-operations';

export const dynamic = 'force-dynamic';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getApiGatewayUrl() {
  return process.env.API_GATEWAY_URL || 'http://api-gateway:8080';
}

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${getApiGatewayUrl()}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: GRAPHQL_OPERATIONS.Login,
        variables: { email, password },
        operationName: 'Login',
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 502 });
    }

    const payload = await res.json();
    const login = payload?.data?.login;

    if (payload.errors?.length || !login?.token || !login?.user) {
      const msg = (payload.errors?.[0]?.message as string | undefined) ?? 'Login failed';
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    const response = NextResponse.json({ user: login.user });
    response.cookies.set('auth-token', login.token as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 502 });
  }
}
