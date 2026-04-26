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

  const { text, language, taskContext, userId } = body;

  if (!text || !language || !taskContext) {
    return NextResponse.json({ error: 'text, language, and taskContext are required' }, { status: 400 });
  }

  const requestId = generateRequestId();
  const orchestratorUrl = process.env.AI_ORCHESTRATOR_URL || 'http://ai-orchestrator:4005';
  const textServiceUrl = process.env.TEXT_SERVICE_URL || 'http://text-service:4002';

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

    // Fire-and-forget: persist structured criteria so stats-service can use them.
    // Best-effort single attempt — setTimeout retry is unreliable after Response is returned
    // in serverless runtimes. Failures are logged with userId + timestamp for observability.
    if (userId && result?.overallScore !== undefined) {
      fetch(`${textServiceUrl}/text/writing-record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': process.env.INTERNAL_SERVICE_SECRET ?? '',
          'x-internal-service': 'frontend-ssr',
        },
        body: JSON.stringify({
          userId: String(userId),
          language,
          text,
          overallScore: result.overallScore,
          grammarVocabularyScore: result.grammarVocabulary?.score ?? null,
          taskAchievementScore: result.taskAchievement?.score ?? null,
          coherenceStructureScore: result.coherenceStructure?.score ?? null,
          styleScore: result.style?.score ?? null,
        }),
      })
        .then((r) => { if (!r.ok) console.error(`[writing-record] failed uid=${userId} status=${r.status} ts=${Date.now()}`); })
        .catch((err) => { console.error(`[writing-record] fetch error uid=${userId} ts=${Date.now()}`, err); });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'AI orchestrator unavailable' }, { status: 502 });
  }
}
