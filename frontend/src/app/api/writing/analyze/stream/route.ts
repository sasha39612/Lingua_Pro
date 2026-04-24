import { NextRequest } from 'next/server';
import { checkOrigin } from '@/lib/csrf-guard';
import { generateRequestId } from '@/lib/request-id';

export const dynamic = 'force-dynamic';
// Writing analysis can take up to 45s inside the orchestrator + network overhead
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const originError = checkOrigin(req);
  if (originError) return originError;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { text, language, taskContext } = body;

  if (!text || !language || !taskContext) {
    return new Response(JSON.stringify({ error: 'text, language, and taskContext are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const requestId = generateRequestId();
  const orchestratorUrl = process.env.AI_ORCHESTRATOR_URL || 'http://ai-orchestrator:4005';

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${orchestratorUrl}/text/analyze-writing/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
      },
      body: JSON.stringify({ text, language, taskContext }),
      // @ts-ignore — Node 20 fetch supports duplex streaming
      duplex: 'half',
    });
  } catch {
    return new Response(JSON.stringify({ error: 'AI orchestrator unavailable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    let detail = '';
    try { detail = await upstreamResponse.text(); } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: 'Writing stream failed', detail }), {
      status: upstreamResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Pipe the orchestrator SSE stream directly to the client
  return new Response(upstreamResponse.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      // Expose requestId so client can read it before the first SSE event
      'x-request-id': requestId,
    },
  });
}
