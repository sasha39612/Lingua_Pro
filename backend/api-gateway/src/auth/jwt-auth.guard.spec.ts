import { vi, type Mocked } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockJwtVerify = vi.hoisted(() => vi.fn());

vi.mock('jsonwebtoken', () => ({ verify: mockJwtVerify }));
vi.mock('./public.decorator', () => ({ IS_PUBLIC_KEY: 'isPublic' }));
vi.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: vi.fn((ctx: any) => ({ getContext: () => ctx._gqlCtx })),
  },
}));

import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGuard() {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(false),
  } as unknown as Mocked<Reflector>;
  const guard = new JwtAuthGuard(reflector);
  return { guard, reflector };
}

function makeHttpContext(headers: Record<string, string> = {}): any {
  const req: any = { headers, user: undefined };
  return {
    getType: () => 'http' as const,
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
    _req: req,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('JwtAuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('allows public routes without checking the token', async () => {
    const { guard, reflector } = makeGuard();
    (reflector.getAllAndOverride as any).mockReturnValue(true);
    const ctx = makeHttpContext();

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  it('allows request when no Authorization header is present', async () => {
    const { guard } = makeGuard();
    const ctx = makeHttpContext({});

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  it('verifies token and attaches user to request', async () => {
    const { guard } = makeGuard();
    const payload = { id: 1, email: 'a@b.com', role: 'student' };
    mockJwtVerify.mockReturnValue(payload);

    const ctx = makeHttpContext({ authorization: 'Bearer valid.jwt.token' });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockJwtVerify).toHaveBeenCalledWith('valid.jwt.token', 'test-secret');
    expect(ctx._req.user).toEqual(payload);
  });

  it('throws UnauthorizedException for malformed Authorization header', async () => {
    const { guard } = makeGuard();
    const ctx = makeHttpContext({ authorization: 'InvalidFormat token' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when token is missing after Bearer', async () => {
    const { guard } = makeGuard();
    const ctx = makeHttpContext({ authorization: 'Bearer' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when jwt.verify rejects the token', async () => {
    const { guard } = makeGuard();
    mockJwtVerify.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    const ctx = makeHttpContext({ authorization: 'Bearer tampered.jwt.token' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('falls back to dev-secret when JWT_SECRET env is not set', async () => {
    const { guard } = makeGuard();
    delete process.env.JWT_SECRET;
    mockJwtVerify.mockReturnValue({ id: 1 });

    const ctx = makeHttpContext({ authorization: 'Bearer some.token' });
    await guard.canActivate(ctx);

    expect(mockJwtVerify).toHaveBeenCalledWith('some.token', 'dev-secret');
  });
});
