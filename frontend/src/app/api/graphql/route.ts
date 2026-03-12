import { NextRequest, NextResponse } from 'next/server';
import { PERSISTED_QUERY_MANIFEST } from '@/lib/persisted-queries';

export const dynamic = 'force-dynamic';

function getGatewayUrl() {
  return process.env.API_GATEWAY_URL || 'http://api-gateway:8080/graphql';
}

async function forwardGraphQL(req: NextRequest) {
  const gatewayUrl = getGatewayUrl();
  const rawBody = await req.text();
  let body = rawBody;
  const authHeader = req.headers.get('authorization');

  try {
    const parsed = JSON.parse(rawBody) as {
      query?: string;
      extensions?: Record<string, unknown> & { persistedQuery?: { sha256Hash?: string } };
    };

    if (!parsed.query) {
      const hash = parsed.extensions?.persistedQuery?.sha256Hash;
      if (hash && PERSISTED_QUERY_MANIFEST[hash]) {
        const { persistedQuery: _persistedQuery, ...restExtensions } = parsed.extensions ?? {};
        body = JSON.stringify({
          ...parsed,
          query: PERSISTED_QUERY_MANIFEST[hash],
          ...(Object.keys(restExtensions).length > 0 ? { extensions: restExtensions } : {}),
        });
      }
    }
  } catch {
    body = rawBody;
  }

  const upstream = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authHeader ? { authorization: authHeader } : {}),
    },
    body,
    cache: 'no-store',
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json',
    },
  });
}

export async function POST(req: NextRequest) {
  return forwardGraphQL(req);
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query');
  if (!query) {
    return NextResponse.json(
      { error: 'GraphQL GET requires query param' },
      { status: 400 },
    );
  }

  const gatewayUrl = getGatewayUrl();
  const authHeader = req.headers.get('authorization');
  const variables = req.nextUrl.searchParams.get('variables');

  const upstream = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authHeader ? { authorization: authHeader } : {}),
    },
    body: JSON.stringify({
      query,
      variables: variables ? JSON.parse(variables) : undefined,
    }),
    cache: 'no-store',
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json',
    },
  });
}
