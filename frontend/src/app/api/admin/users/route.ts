import { NextRequest, NextResponse } from 'next/server';
import { GRAPHQL_OPERATIONS } from '@/lib/graphql-operations';

export const dynamic = 'force-dynamic';

function getAdminPayload(token: string): { role?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const payload = token ? getAdminPayload(token) : null;
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
        Authorization: authHeader,
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
