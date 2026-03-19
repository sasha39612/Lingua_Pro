import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
// Pronunciation analysis can take up to ~30s; raise the function timeout
export const maxDuration = 60;


export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audioBlob = formData.get('audio') as Blob | null;
  const language = formData.get('language') as string | null;
  const userId = formData.get('userId') as string | null;
  const referenceText = formData.get('referenceText') as string | null;

  if (!audioBlob || !language || !userId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
  const audioBase64 = audioBuffer.toString('base64');
  const mimeType = audioBlob.type || 'audio/webm';

  const audioServiceUrl = process.env.AUDIO_SERVICE_URL || 'http://audio-service:4003';

  try {
    const response = await fetch(`${audioServiceUrl}/audio/analyze-base64`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, mimeType, language, userId, expectedText: referenceText ?? '' }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Audio analysis failed' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Audio service unavailable' }, { status: 502 });
  }
}
