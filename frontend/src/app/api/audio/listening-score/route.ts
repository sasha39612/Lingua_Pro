import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { taskId?: number; answers?: string[]; userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { taskId, answers, userId } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 401 });
  }
  if (!taskId || !Array.isArray(answers)) {
    return NextResponse.json({ error: 'taskId and answers are required' }, { status: 400 });
  }

  const audioServiceUrl = process.env.AUDIO_SERVICE_URL || 'http://audio-service:4003';

  try {
    const response = await fetch(`${audioServiceUrl}/audio/listening-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ taskId, answers }),
    });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return NextResponse.json(
        { error: 'Failed to submit score', detail },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Audio service unavailable' }, { status: 502 });
  }
}
