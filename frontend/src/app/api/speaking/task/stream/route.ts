import { NextRequest } from 'next/server';
import { generateRequestId } from '@/lib/request-id';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

  const requestId = generateRequestId();
  const textServiceUrl = process.env.TEXT_SERVICE_URL || 'http://text-service:4002';

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${textServiceUrl}/text/tasks/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId ? String(userId) : '',
        'x-request-id': requestId,
      },
      body: JSON.stringify({ language, level, skill: 'speaking', userId: userId ? String(userId) : undefined }),
      // @ts-ignore — Node 20 fetch supports duplex streaming
      duplex: 'half',
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Text service unavailable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    let detail = '';
    try { detail = await upstreamResponse.text(); } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: 'Speaking task stream failed', detail }), {
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
