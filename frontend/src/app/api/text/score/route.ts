import { NextRequest, NextResponse } from 'next/server';
import { checkOrigin } from '@/lib/csrf-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const originError = checkOrigin(req);
  if (originError) return originError;

  let body: { userId: string; language: string; level: string; skill: string; score: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, language, level, skill, score } = body;
  if (!userId || !language || !level || !skill || typeof score !== 'number') {
    return NextResponse.json({ error: 'userId, language, level, skill, and score are required' }, { status: 400 });
  }

  const textServiceUrl = process.env.TEXT_SERVICE_URL || 'http://text-service:4002';

  try {
    const res = await fetch(`${textServiceUrl}/text/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, language, level, skill, score }),
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
