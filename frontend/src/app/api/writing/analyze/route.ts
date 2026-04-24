import { NextRequest, NextResponse } from 'next/server';
import { checkOrigin } from '@/lib/csrf-guard';
import { generateRequestId } from '@/lib/request-id';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const originError = checkOrigin(req);
  if (originError) return originError;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { text, language, taskContext } = body;

  if (!text || !language || !taskContext) {
    return NextResponse.json({ error: 'text, language, and taskContext are required' }, { status: 400 });
  }

  const requestId = generateRequestId();
  const orchestratorUrl = process.env.AI_ORCHESTRATOR_URL || 'http://ai-orchestrator:4005';

  try {
    const response = await fetch(`${orchestratorUrl}/text/analyze-writing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': requestId },
      body: JSON.stringify({ text, language, taskContext }),
      signal: AbortSignal.timeout(55_000),
    });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return NextResponse.json(
        { error: 'Writing analysis failed', detail },
        { status: response.status },
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'AI orchestrator unavailable' }, { status: 502 });
  }
}
