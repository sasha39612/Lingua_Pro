import { NextRequest, NextResponse } from 'next/server';
import { generateRequestId } from '@/lib/request-id';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const language = searchParams.get('language');
  const level = searchParams.get('level');
  const userId = searchParams.get('userId');

  if (!language || !level) {
    return NextResponse.json({ error: 'language and level are required' }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 401 });
  }

  const requestId = generateRequestId();
  const audioServiceUrl = process.env.AUDIO_SERVICE_URL || 'http://audio-service:4003';

  try {
    const response = await fetch(
      `${audioServiceUrl}/audio/listening-task?language=${encodeURIComponent(language)}&level=${encodeURIComponent(level)}`,
      {
        headers: { 'x-user-id': userId, 'x-request-id': requestId },
        // TTS generation for a 400-word passage can take up to 45 s
        signal: AbortSignal.timeout(110_000),
      },
    );

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return NextResponse.json(
        { error: 'Failed to load listening task', detail },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Audio service unavailable' }, { status: 502 });
  }
}
