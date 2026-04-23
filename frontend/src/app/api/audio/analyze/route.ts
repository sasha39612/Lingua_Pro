import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
// Pronunciation analysis can take up to ~30s; raise the function timeout
export const maxDuration = 60;


const AUDIO_MAX_BYTES = 10_485_760; // 10 MiB
const ALLOWED_AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/x-m4a',
]);

export async function POST(req: NextRequest) {
  // Reject oversized uploads before reading the full body.
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > AUDIO_MAX_BYTES * 1.5) {
    return NextResponse.json({ error: 'Audio file too large (max 10 MB)' }, { status: 413 });
  }

  const formData = await req.formData();
  const audioBlob = formData.get('audio') as Blob | null;
  const language = formData.get('language') as string | null;
  const userId = formData.get('userId') as string | null;
  const referenceText = formData.get('referenceText') as string | null;

  if (!audioBlob || !language || !userId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const mimeType = (audioBlob.type || 'audio/webm').toLowerCase();
  if (!ALLOWED_AUDIO_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: `Unsupported audio format: "${mimeType}"` },
      { status: 415 },
    );
  }

  const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());

  if (audioBuffer.byteLength > AUDIO_MAX_BYTES) {
    return NextResponse.json({ error: 'Audio file too large (max 10 MB)' }, { status: 413 });
  }

  const audioBase64 = audioBuffer.toString('base64');

  const audioServiceUrl = process.env.AUDIO_SERVICE_URL || 'http://audio-service:4003';

  try {
    const response = await fetch(`${audioServiceUrl}/audio/analyze-base64`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, mimeType, language, userId, expectedText: referenceText ?? '' }),
    });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return NextResponse.json(
        { error: 'Audio analysis failed', detail, status: response.status },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Audio service unavailable' }, { status: 502 });
  }
}
