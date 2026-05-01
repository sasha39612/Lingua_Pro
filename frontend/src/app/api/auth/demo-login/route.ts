import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json({ error: 'Demo access is disabled' }, { status: 403 });
}
