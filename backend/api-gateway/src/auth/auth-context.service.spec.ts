import { vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockJwtVerify = vi.hoisted(() => vi.fn());
vi.mock('jsonwebtoken', () => ({ verify: mockJwtVerify }));

import { AuthContextService } from './auth-context.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeService() {
  return new AuthContextService();
}

function makeRequest(authHeader?: string): any {
  return { headers: authHeader ? { authorization: authHeader } : {} };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthContextService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('returns empty context when no Authorization header is present', async () => {
    const service = makeService();
    const result = await service.extractContext(makeRequest());

    expect(result).toEqual({});
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  it('extracts userId (from payload.id), user, and token from a valid Bearer token', async () => {
    const service = makeService();
    const payload = { id: '42', email: 'a@b.com', role: 'student', language: 'english' };
    mockJwtVerify.mockReturnValue(payload);

    const result = await service.extractContext(makeRequest('Bearer valid.jwt.token'));

    expect(mockJwtVerify).toHaveBeenCalledWith('valid.jwt.token', 'test-secret');
    expect(result.userId).toBe('42');
    expect(result.user).toEqual(payload);
    expect(result.token).toBe('valid.jwt.token');
  });

  it('prefers payload.sub over payload.id for userId', async () => {
    const service = makeService();
    mockJwtVerify.mockReturnValue({ sub: 'sub-id', id: 'id-val' });

    const result = await service.extractContext(makeRequest('Bearer tok'));

    expect(result.userId).toBe('sub-id');
  });

  it('returns empty context when token verification fails', async () => {
    const service = makeService();
    mockJwtVerify.mockImplementation(() => { throw new Error('invalid signature'); });

    const result = await service.extractContext(makeRequest('Bearer bad.token'));

    expect(result).toEqual({});
  });

  it('returns empty context when Authorization header has wrong format', async () => {
    const service = makeService();

    const result = await service.extractContext(makeRequest('Basic dXNlcjpwYXNz'));

    expect(result).toEqual({});
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  it('returns empty context when Authorization header has no token after Bearer', async () => {
    const service = makeService();

    const result = await service.extractContext(makeRequest('Bearer'));

    expect(result).toEqual({});
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  it('uses dev-secret when JWT_SECRET env is not set', async () => {
    delete process.env.JWT_SECRET;
    const service = makeService();
    mockJwtVerify.mockReturnValue({ id: '1' });

    await service.extractContext(makeRequest('Bearer some.token'));

    expect(mockJwtVerify).toHaveBeenCalledWith('some.token', 'dev-secret');
  });

  it('handles uppercase Authorization header key', async () => {
    const service = makeService();
    mockJwtVerify.mockReturnValue({ id: '1' });

    const req = { headers: { Authorization: 'Bearer valid.token' } };
    const result = await service.extractContext(req);

    expect(result.token).toBe('valid.token');
  });
});
