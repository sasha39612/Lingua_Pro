import { NextRequest, NextResponse } from 'next/server';
import { GRAPHQL_OPERATIONS } from '@/lib/graphql-operations';
import { getAuthToken, verifyAdminJwt } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = getAuthToken(req);
  const payload = token ? verifyAdminJwt(token) : null;
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit  = parseInt(searchParams.get('limit')  ?? '100', 10);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const apiGatewayUrl = process.env.API_GATEWAY_URL || 'http://api-gateway:8080';

  try {
    const res = await fetch(`${apiGatewayUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: GRAPHQL_OPERATIONS.AdminUsers,
        variables: { limit, offset },
        operationName: 'AdminUsers',
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return NextResponse.json({ error: 'Gateway error', detail }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Gateway unavailable' }, { status: 502 });
  }
}
