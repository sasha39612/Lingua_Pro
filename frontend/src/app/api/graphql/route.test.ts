import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => {
  class MockNextResponse {
    body: string;
    status: number;
    headers: Headers;

    constructor(body: string, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = new Headers(init?.headers);
    }

    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(JSON.stringify(body), {
        status: init?.status,
        headers: {
          'content-type': 'application/json',
        },
      });
    }

    async text() {
      return this.body;
    }
  }

  return {
    NextResponse: MockNextResponse,
  };
});

vi.mock('@/lib/persisted-queries', () => ({
  PERSISTED_QUERY_MANIFEST: {
    knownhash: 'query Me { me { id } }',
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('/api/graphql route', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.API_GATEWAY_URL = 'http://gateway.test/graphql';
  });

  it('strips extensions entirely when only persistedQuery was present (the standard app case)', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify({ data: { me: { id: 1 } } })),
    });

    const { POST } = await import('./route');

    const requestWithOnlyPersistedQuery = {
      headers: new Headers(),
      cookies: { get: vi.fn().mockReturnValue(undefined) },
      text: () => Promise.resolve(JSON.stringify({
        operationName: 'Me',
        variables: {},
        extensions: {
          persistedQuery: { version: 1, sha256Hash: 'knownhash' },
        },
      })),
    };

    await POST(requestWithOnlyPersistedQuery as never);

    const forwardedBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(forwardedBody.query).toBe('query Me { me { id } }');
    // extensions must be completely absent — Apollo rejects any persistedQuery field
    // that doesn't match the actual query text
    expect(forwardedBody.extensions).toBeUndefined();
  });

  it('forwards locally resolved persisted queries without persistedQuery metadata', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      headers: new Headers({
        'content-type': 'application/json',
      }),
      text: () => Promise.resolve(JSON.stringify({ data: { me: { id: 1 } } })),
    });

    const { POST } = await import('./route');

    const request = {
      headers: new Headers({ authorization: 'Bearer token' }),
      cookies: { get: vi.fn().mockReturnValue(undefined) },
      text: () => Promise.resolve(JSON.stringify({
        operationName: 'Me',
        variables: { demo: true },
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: 'knownhash',
          },
          tracing: {
            enabled: true,
          },
        },
      })),
    };

    const response = await POST(request as never);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://gateway.test/graphql');
    expect(options.headers.authorization).toBe('Bearer token');

    const forwardedBody = JSON.parse(options.body as string);
    expect(forwardedBody.query).toBe('query Me { me { id } }');
    expect(forwardedBody.extensions).toEqual({
      tracing: {
        enabled: true,
      },
    });
    expect(forwardedBody.extensions.persistedQuery).toBeUndefined();

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(JSON.stringify({ data: { me: { id: 1 } } }));
  });
});