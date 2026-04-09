import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

  const textServiceUrl = process.env.TEXT_SERVICE_URL || 'http://text-service:4002';

  try {
    const params = new URLSearchParams({ language, level, skill: 'writing' });
    const response = await fetch(`${textServiceUrl}/text/tasks?${params.toString()}`, {
      headers: { 'x-user-id': userId },
      signal: AbortSignal.timeout(55_000),
    });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return NextResponse.json(
        { error: 'Failed to load writing task', detail },
        { status: response.status },
      );
    }

    const tasks: any[] = await response.json();
    const task = tasks[0];
    if (!task) {
      return NextResponse.json({ error: 'No writing task available' }, { status: 404 });
    }

    // prompt field contains the serialised WritingTask JSON
    let writingTask: any = null;
    try {
      writingTask = typeof task.prompt === 'string' ? JSON.parse(task.prompt) : task.prompt;
    } catch {
      return NextResponse.json({ error: 'Invalid writing task format' }, { status: 502 });
    }

    return NextResponse.json({ taskId: task.id, writingTask });
  } catch {
    return NextResponse.json({ error: 'Text service unavailable' }, { status: 502 });
  }
}
