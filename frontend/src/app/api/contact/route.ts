import { NextRequest, NextResponse } from 'next/server';
import { checkOrigin } from '@/lib/csrf-guard';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const originError = checkOrigin(req);
  if (originError) return originError;

  let body: { message?: unknown; honeypot?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message, honeypot } = body;

  // Honeypot — silently accept but skip sending to avoid training bots
  if (honeypot) return NextResponse.json({ ok: true });

  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    return NextResponse.json({ error: 'Message too short' }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  const host = process.env.CONTACT_SMTP_HOST;
  const user = process.env.CONTACT_SMTP_USER;
  const pass = process.env.CONTACT_SMTP_PASS;
  const to = process.env.CONTACT_TO_EMAIL ?? 'stolyarov_396@icloud.com';

  if (!host || !user || !pass) {
    console.error('[contact] SMTP env vars not configured');
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.CONTACT_SMTP_PORT ?? 587),
    secure: false,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"LanguageLab FEEDBACK" <${user}>`,
    to,
    subject: 'LanguageLab FEEDBACK',
    text: message.trim(),
  });

  return NextResponse.json({ ok: true });
}
