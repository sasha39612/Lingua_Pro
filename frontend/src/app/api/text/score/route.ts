import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { userId: string; language: string; skill: string; score: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, language, skill, score } = body;
  if (!userId || !language || !skill || typeof score !== 'number') {
    return NextResponse.json({ error: 'userId, language, skill, and score are required' }, { status: 400 });
  }

  const textServiceUrl = process.env.TEXT_SERVICE_URL || 'http://text-service:4002';

  try {
    const res = await fetch(`${textServiceUrl}/text/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, language, skill, score }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return NextResponse.json({ error: 'text-service error', detail }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'text-service unavailable' }, { status: 502 });
  }
}
