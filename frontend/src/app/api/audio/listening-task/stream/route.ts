import { NextRequest } from 'next/server';
import { generateRequestId } from '@/lib/request-id';

export const dynamic = 'force-dynamic';
// Phase 1 (AI generation) ~15s + Phase 2 (TTS) ~45s + margin
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { language, level, userId } = body;

  if (!language || !level) {
    return new Response(JSON.stringify({ error: 'language and level are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId is required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const requestId = generateRequestId();
  const audioServiceUrl = process.env.AUDIO_SERVICE_URL || 'http://audio-service:4003';

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${audioServiceUrl}/audio/listening-task/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String(userId),
        'x-request-id': requestId,
      },
      body: JSON.stringify({ language, level }),
      // @ts-ignore — Node 20 fetch supports duplex streaming
      duplex: 'half',
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Audio service unavailable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    let detail = '';
    try { detail = await upstreamResponse.text(); } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: 'Listening task stream failed', detail }), {
      status: upstreamResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(upstreamResponse.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'x-request-id': requestId,
    },
  });
}
