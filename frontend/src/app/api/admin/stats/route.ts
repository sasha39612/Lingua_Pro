import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/server-auth';

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
  const token = getAuthToken(req);
  const payload = token ? getAdminPayload(token) : null;
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period   = searchParams.get('period')   ?? 'week';
  const language = searchParams.get('language') ?? '';
  const exact    = searchParams.get('exact')    ?? '';

  const statsServiceUrl = process.env.STATS_SERVICE_URL || 'http://stats-service:4004';
  const internalSecret  = process.env.INTERNAL_SERVICE_SECRET ?? '';

  const params = new URLSearchParams({ period });
  if (language) params.set('language', language);
  if (exact)    params.set('exact', exact);

  try {
    const res = await fetch(`${statsServiceUrl}/admin/stats?${params}`, {
      headers: {
        'x-internal-token':   internalSecret,
        'x-internal-service': 'api-gateway',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return NextResponse.json({ error: 'Stats service error', detail }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Stats service unavailable' }, { status: 502 });
  }
}
