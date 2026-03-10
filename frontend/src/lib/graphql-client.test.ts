import { vi, describe, it, expect, beforeEach } from 'vitest';
import { graphqlRequest } from './graphql-client';

vi.mock('@/lib/persisted-queries', () => ({
  OPERATION_HASH_BY_NAME: {
    GetMe: 'abc123hash',
    Login: 'def456hash',
  },
}));

vi.mock('@/lib/graphql-operations', () => ({
  GRAPHQL_OPERATIONS: {
    GetMe: 'query GetMe { me { id email } }',
    Login: 'mutation Login($email: String!, $password: String!) { login(email: $email, password: $password) { token } }',
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(body: object) {
  return Promise.resolve({
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('graphqlRequest', () => {
  it('sends persisted query with sha256Hash and returns data', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ data: { me: { id: 1, email: 'a@b.com' } } }));

    const result = await graphqlRequest({ operationName: 'GetMe' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/graphql');
    const body = JSON.parse(options.body);
    expect(body.extensions.persistedQuery.sha256Hash).toBe('abc123hash');
    expect(result).toEqual({ me: { id: 1, email: 'a@b.com' } });
  });

  it('includes Authorization header when token is provided', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ data: { me: { id: 1 } } }));

    await graphqlRequest({ operationName: 'GetMe', token: 'mytoken' });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['authorization']).toBe('Bearer mytoken');
  });

  it('omits Authorization header when token is null', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ data: { me: { id: 1 } } }));

    await graphqlRequest({ operationName: 'GetMe', token: null });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers).not.toHaveProperty('authorization');
  });

  it('throws when response contains errors', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ errors: [{ message: 'Not authenticated' }, { message: 'Token expired' }] }),
    );

    await expect(graphqlRequest({ operationName: 'GetMe' })).rejects.toThrow(
      'Not authenticated; Token expired',
    );
  });

  it('retries with full query when data is empty (persisted query miss)', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({})) // persisted query miss → no data
      .mockResolvedValueOnce(mockResponse({ data: { me: { id: 2 } } }));

    const result = await graphqlRequest({ operationName: 'GetMe' });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [, fallbackOptions] = mockFetch.mock.calls[1];
    const fallbackBody = JSON.parse(fallbackOptions.body);
    expect(fallbackBody.query).toBe('query GetMe { me { id email } }');
    expect(result).toEqual({ me: { id: 2 } });
  });

  it('throws on fallback errors', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({}))
      .mockResolvedValueOnce(mockResponse({ errors: [{ message: 'Server error' }] }));

    await expect(graphqlRequest({ operationName: 'GetMe' })).rejects.toThrow('Server error');
  });

  it('throws when fallback also returns empty payload', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({}))
      .mockResolvedValueOnce(mockResponse({}));

    await expect(graphqlRequest({ operationName: 'GetMe' })).rejects.toThrow(
      'GraphQL returned empty payload',
    );
  });

  it('passes variables in the request body', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ data: { login: { token: 'tok' } } }));

    await graphqlRequest({
      operationName: 'Login',
      variables: { email: 'x@y.com', password: 'secret' },
    });

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.variables).toEqual({ email: 'x@y.com', password: 'secret' });
  });
});
