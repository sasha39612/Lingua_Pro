import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

function createFallbackStream(text: string) {
  const chunks = (text || 'No feedback available').match(/.{1,8}/g) ?? [];
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      let index = 0;
      const timer = setInterval(() => {
        if (index >= chunks.length) {
          controller.close();
          clearInterval(timer);
          return;
        }
        controller.enqueue(encoder.encode(chunks[index]));
        index += 1;
      }, 45);
    },
  });
}

export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get('text') || '';
  const language = req.nextUrl.searchParams.get('language') || 'English';

  const orchestratorUrl =
    process.env.AI_ORCHESTRATOR_URL || 'http://ai-orchestrator:4005';

  try {
    const upstream = await fetch(
      `${orchestratorUrl}/text/analyze/stream?text=${encodeURIComponent(text)}&language=${encodeURIComponent(language)}`,
      {
        headers: { Accept: 'text/event-stream' },
        cache: 'no-store',
      },
    );

    if (!upstream.ok || !upstream.body) {
      return new Response(createFallbackStream(text), {
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store',
        },
      });
    }

    return new Response(upstream.body, {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-store',
        connection: 'keep-alive',
      },
    });
  } catch {
    return new Response(createFallbackStream(text), {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }
}
