import { NextRequest, NextResponse } from 'next/server';
import { checkOrigin } from '@/lib/csrf-guard';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

const SERVER_ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const SAFE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xls', 'xlsx',
]);

function isAllowedFileServer(f: File): boolean {
  if (SERVER_ALLOWED_TYPES.has(f.type)) return true;
  // Fallback for Safari/iOS which may send application/octet-stream
  if (f.type === 'application/octet-stream') {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    return SAFE_EXTENSIONS.has(ext);
  }
  return false;
}

export async function POST(req: NextRequest) {
  const originError = checkOrigin(req);
  if (originError) return originError;

  // Fast-fail when Content-Length is present; chunked uploads or proxy rewrites may omit it,
  // so per-file and total checks below still run unconditionally
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 15 * 1024 * 1024) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  }

  let message: string;
  let honeypot: string | null;
  let rawFiles: File[];

  try {
    const fd = await req.formData();
    message = (fd.get('message') as string | null) ?? '';
    honeypot = fd.get('honeypot') as string | null;
    rawFiles = fd.getAll('files') as File[];
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  // Honeypot — silently accept but skip sending to avoid training bots
  if (honeypot) return NextResponse.json({ ok: true });

  if (!message || message.trim().length < 10) {
    return NextResponse.json({ error: 'Message too short' }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  if (rawFiles.length > 3) {
    return NextResponse.json({ error: 'Too many files' }, { status: 400 });
  }
  for (const f of rawFiles) {
    if (f.size === 0) {
      return NextResponse.json({ error: `Empty file: ${f.name}` }, { status: 400 });
    }
    if (!isAllowedFileServer(f)) {
      return NextResponse.json({ error: `Unsupported file type: ${f.type}` }, { status: 415 });
    }
    if (f.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: `File too large: ${f.name}` }, { status: 413 });
    }
  }
  if (rawFiles.reduce((s, f) => s + f.size, 0) > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Total attachment size exceeds 10 MB' }, { status: 413 });
  }

  const host = process.env.CONTACT_SMTP_HOST;
  const user = process.env.CONTACT_SMTP_USER;
  const pass = process.env.CONTACT_SMTP_PASS;
  const to = process.env.CONTACT_TO_EMAIL;

  if (!host || !user || !pass || !to) {
    console.error('[contact] SMTP env vars not configured');
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
  }

  const port = Number(process.env.CONTACT_SMTP_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  // Files are loaded into memory (max 10 MB total) — acceptable for this volume
  const attachments: { filename: string; content: Buffer; contentType: string }[] = [];
  for (const f of rawFiles) {
    // Strip path separators, control characters, and cap length for mail client compatibility
    const safeName = (f.name.replace(/[/\\]/g, '_').replace(/[\x00-\x1f]/g, '') || 'attachment').slice(0, 180);
    attachments.push({
      filename: safeName,
      content: Buffer.from(await f.arrayBuffer()),
      contentType: f.type,
    });
  }

  try {
    await transporter.sendMail({
      from: `"LanguageLab FEEDBACK" <${user}>`,
      to,
      subject: 'LanguageLab FEEDBACK',
      text: message.trim(),
      ...(attachments.length > 0 && { attachments }),
    });
  } catch (err) {
    console.error('[contact] sendMail failed:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
