import { NextRequest, NextResponse } from 'next/server';

/**
 * Sentry event tunnel — forwards browser Sentry envelopes through our own
 * domain to avoid ad-blocker interference and CSP issues with Sentry's
 * ingestion domain (sentry.io).
 *
 * Configured in instrumentation-client.ts via: tunnel: '/api/sentry-tunnel'
 *
 * Security:
 * - Parses the envelope header and validates the DSN matches our configured
 *   project before forwarding, preventing this route from being used as an
 *   open proxy to arbitrary Sentry projects.
 * - Only forwards POST requests; no GET handler means this can't be probed.
 */

interface ParsedDsn {
  host: string;
  projectId: string;
}

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, '');
    if (!projectId) return null;
    return { host: url.host, projectId };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    // Sentry not configured — silently accept and discard so the browser
    // doesn't log tunnel errors in environments without Sentry.
    return new NextResponse(null, { status: 200 });
  }

  const expected = parseDsn(dsn);
  if (!expected) {
    return NextResponse.json({ error: 'Invalid Sentry DSN configuration' }, { status: 500 });
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 });
  }

  // Sentry envelope format: first line is the envelope header JSON.
  // Validate the DSN inside the envelope matches our project.
  const firstLine = body.split('\n')[0];
  try {
    const header = JSON.parse(firstLine) as { dsn?: string };
    if (header.dsn) {
      const incoming = parseDsn(header.dsn);
      if (!incoming || incoming.projectId !== expected.projectId) {
        return NextResponse.json({ error: 'DSN project mismatch' }, { status: 400 });
      }
    }
  } catch {
    return NextResponse.json({ error: 'Invalid envelope header' }, { status: 400 });
  }

  const upstreamUrl = `https://${expected.host}/api/${expected.projectId}/envelope/`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body,
    });

    // Relay Sentry's response status so the SDK can handle retries correctly.
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to reach Sentry upstream' }, { status: 502 });
  }
}
