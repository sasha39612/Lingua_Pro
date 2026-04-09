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
    const params = new URLSearchParams({ language, level, skill: 'reading' });
    const response = await fetch(`${textServiceUrl}/text/tasks?${params.toString()}`, {
      headers: { 'x-user-id': userId },
      signal: AbortSignal.timeout(55_000),
    });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return NextResponse.json(
        { error: 'Failed to load reading task', detail },
        { status: response.status },
      );
    }

    const tasks: any[] = await response.json();
    const task = tasks[0];
    if (!task) {
      return NextResponse.json({ error: 'No reading task available' }, { status: 404 });
    }

    // questions is stored as a JSON value in Postgres — ensure it is an array
    const questions = Array.isArray(task.questions)
      ? task.questions
      : typeof task.questions === 'string'
        ? JSON.parse(task.questions)
        : [];

    return NextResponse.json({
      taskId: task.id,
      passage: task.referenceText ?? '',
      questions,
    });
  } catch {
    return NextResponse.json({ error: 'Text service unavailable' }, { status: 502 });
  }
}
