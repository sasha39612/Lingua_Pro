import { NextRequest, NextResponse } from 'next/server';
import { GRAPHQL_OPERATIONS } from '@/lib/graphql-operations';

export const dynamic = 'force-dynamic';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Credentials are injected via env vars so they can point at real seeded accounts.
// Defaults are placeholders only — configure DEMO_STUDENT_* / DEMO_ADMIN_* in .env.
const DEMO_CREDENTIALS = {
  student: {
    email: process.env.DEMO_STUDENT_EMAIL ?? 'demo.student@lingua.pro',
    password: process.env.DEMO_STUDENT_PASSWORD ?? 'demo-student-pass',
  },
  admin: {
    email: process.env.DEMO_ADMIN_EMAIL ?? 'demo.admin@lingua.pro',
    password: process.env.DEMO_ADMIN_PASSWORD ?? 'demo-admin-pass',
  },
} as const;

function getApiGatewayUrl() {
  return process.env.API_GATEWAY_URL || 'http://api-gateway:8080';
}

export async function POST(req: NextRequest) {
  let body: { type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const type = body.type === 'admin' ? 'admin' : 'student';
  const creds = DEMO_CREDENTIALS[type];

  try {
    const res = await fetch(`${getApiGatewayUrl()}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: GRAPHQL_OPERATIONS.Login,
        variables: { email: creds.email, password: creds.password },
        operationName: 'Login',
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Demo login unavailable' }, { status: 502 });
    }

    const payload = await res.json();
    const login = payload?.data?.login;

    if (payload.errors?.length || !login?.token || !login?.user) {
      return NextResponse.json(
        { error: 'Demo credentials not configured — seed the database first' },
        { status: 401 },
      );
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
    return NextResponse.json({ error: 'Demo login unavailable' }, { status: 502 });
  }
}
