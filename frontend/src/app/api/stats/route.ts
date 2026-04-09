import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const language = searchParams.get('language') ?? 'English';
  const period = searchParams.get('period') ?? 'week';

  const statsServiceUrl = process.env.STATS_SERVICE_URL || 'http://stats-service:4004';

  try {
    const res = await fetch(
      `${statsServiceUrl}/stats?language=${encodeURIComponent(language)}&period=${encodeURIComponent(period)}`,
      { signal: AbortSignal.timeout(10_000) },
    );

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
