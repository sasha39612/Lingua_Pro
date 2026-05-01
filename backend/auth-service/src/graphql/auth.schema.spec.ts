import { vi } from 'vitest';

// ─── Hoisted mocks (must exist before vi.mock factories run) ──────────────────

const mockPrismaInstance = vi.hoisted(() => ({
  session: {
    findUnique: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const mockJwtVerify = vi.hoisted(() => vi.fn());
const mockJwtSign = vi.hoisted(() => vi.fn());
const mockArgon2Hash = vi.hoisted(() => vi.fn());
const mockArgon2Verify = vi.hoisted(() => vi.fn());

// Capture resolvers passed to buildSubgraphSchema so we can call them directly
const capturedSchema = vi.hoisted(() => ({ resolvers: null as any }));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../generated/prisma', () => ({ PrismaClient: vi.fn(function () { return mockPrismaInstance; }) }));
vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: vi.fn(function () {}) }));
vi.mock('pg', () => ({ Pool: vi.fn(function () {}) }));
vi.mock('@apollo/subgraph', () => ({
  buildSubgraphSchema: vi.fn((configs: any[]) => {
    capturedSchema.resolvers = configs[0].resolvers;
    return {};
  }),
}));
vi.mock('graphql-tag', () => ({ gql: vi.fn((s: any) => s) }));
vi.mock('argon2', () => ({ hash: mockArgon2Hash, verify: mockArgon2Verify }));
vi.mock('jsonwebtoken', () => ({ verify: mockJwtVerify, sign: mockJwtSign }));

import { verifyToken } from './auth.schema';

// ─── Tests — verifyToken ────────────────────────────────────────────────────

describe('verifyToken', () => {
  const fakeToken = 'header.payload.signature';
  const fakePayload = { id: '1', email: 'a@b.com', role: 'student' };
  const fakeSession = { id: 1, userId: 1, token: fakeToken, expiresAt: new Date() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns decoded payload when token is valid and session exists', async () => {
    mockJwtVerify.mockReturnValue(fakePayload);
    mockPrismaInstance.session.findUnique.mockResolvedValue(fakeSession);

    const result = await verifyToken(fakeToken);

    expect(mockJwtVerify).toHaveBeenCalledWith(fakeToken, expect.any(String), { algorithms: ['HS256'] });
    expect(mockPrismaInstance.session.findUnique).toHaveBeenCalledWith({ where: { token: fakeToken } });
    expect(result).toEqual(fakePayload);
  });

  it('throws "Session revoked" when session does not exist', async () => {
    mockJwtVerify.mockReturnValue(fakePayload);
    mockPrismaInstance.session.findUnique.mockResolvedValue(null);

    await expect(verifyToken(fakeToken)).rejects.toThrow('Session revoked');
  });

  it('propagates jwt.verify error (invalid/expired token)', async () => {
    mockJwtVerify.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    await expect(verifyToken(fakeToken)).rejects.toThrow('invalid signature');
    expect(mockPrismaInstance.session.findUnique).not.toHaveBeenCalled();
  });

  it('propagates jwt.verify TokenExpiredError', async () => {
    mockJwtVerify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    await expect(verifyToken('expired.token.here')).rejects.toThrow('jwt expired');
  });

  it('calls jwt.verify with some secret string (JWT_SECRET captured at module load)', async () => {
    // JWT_SECRET is captured as a module-level const when auth.schema.ts is imported.
    // We verify only that jwt.verify is called with *a* string secret (not undefined).
    mockJwtVerify.mockReturnValue(fakePayload);
    mockPrismaInstance.session.findUnique.mockResolvedValue(fakeSession);

    await verifyToken(fakeToken);
    expect(mockJwtVerify).toHaveBeenCalledWith(fakeToken, expect.any(String), { algorithms: ['HS256'] });
  });
});

// ─── Tests — resolvers ────────────────────────────────────────────────────────

describe('Auth resolvers (captured from buildSubgraphSchema)', () => {
  const fakeUser = {
    id: 1,
    email: 'test@example.com',
    passwordHash: 'hashed',
    role: 'student',
    language: 'english',
  };
  const fakeSession = { id: 10, userId: 1, token: 'tok', expiresAt: new Date() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockJwtSign.mockReturnValue('signed-token');
    mockPrismaInstance.session.create.mockResolvedValue(fakeSession);
  });

  // ─── Query.me ─────────────────────────────────────────────────────────────

  describe('Query.me', () => {
    it('returns null when context has no userId', async () => {
      const result = await capturedSchema.resolvers.Query.me(null, {}, {});
      expect(result).toBeNull();
      expect(mockPrismaInstance.user.findUnique).not.toHaveBeenCalled();
    });

    it('fetches and returns user when context.userId is set', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(fakeUser);
      const result = await capturedSchema.resolvers.Query.me(null, {}, { userId: '1' });
      expect(mockPrismaInstance.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(fakeUser);
    });
  });

  // ─── Query.user ───────────────────────────────────────────────────────────

  describe('Query.user', () => {
    it('throws Unauthorized when context has no userId', async () => {
      await expect(
        capturedSchema.resolvers.Query.user(null, { id: '1' }, {}),
      ).rejects.toThrow('Unauthorized');
    });

    it('allows admin to fetch any user', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(fakeUser);
      const result = await capturedSchema.resolvers.Query.user(
        null,
        { id: '5' },
        { userId: '1', role: 'admin' },
      );
      expect(mockPrismaInstance.user.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(result).toEqual(fakeUser);
    });

    it('allows user to fetch their own record', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(fakeUser);
      const result = await capturedSchema.resolvers.Query.user(
        null,
        { id: '1' },
        { userId: '1', role: 'student' },
      );
      expect(result).toEqual(fakeUser);
    });

    it('throws Forbidden when non-admin tries to access another user', async () => {
      await expect(
        capturedSchema.resolvers.Query.user(null, { id: '99' }, { userId: '1', role: 'student' }),
      ).rejects.toThrow('Forbidden');
    });
  });

  // ─── Query.validateToken ──────────────────────────────────────────────────

  describe('Query.validateToken', () => {
    it('returns user when token is valid', async () => {
      mockJwtVerify.mockReturnValue({ id: '1' });
      mockPrismaInstance.session.findUnique.mockResolvedValue(fakeSession);
      mockPrismaInstance.user.findUnique.mockResolvedValue(fakeUser);

      const result = await capturedSchema.resolvers.Query.validateToken(null, { token: 'valid-token' });
      expect(result).toEqual(fakeUser);
    });

    it('returns null when token is invalid', async () => {
      mockJwtVerify.mockImplementation(() => { throw new Error('invalid'); });
      const result = await capturedSchema.resolvers.Query.validateToken(null, { token: 'bad-token' });
      expect(result).toBeNull();
    });

    it('returns null when payload has no id', async () => {
      mockJwtVerify.mockReturnValue({});
      mockPrismaInstance.session.findUnique.mockResolvedValue(fakeSession);
      const result = await capturedSchema.resolvers.Query.validateToken(null, { token: 'no-id-token' });
      expect(result).toBeNull();
    });
  });

  // ─── Mutation.register ────────────────────────────────────────────────────

  describe('Mutation.register', () => {
    const adminCtx = { userId: '1', role: 'admin' };

    it('throws Unauthorized for unauthenticated callers', async () => {
      await expect(
        capturedSchema.resolvers.Mutation.register(null, { email: 'x@x.com', password: 'Test1234' }, {}),
      ).rejects.toThrow('Unauthorized');
    });

    it('throws Forbidden for non-admin users', async () => {
      await expect(
        capturedSchema.resolvers.Mutation.register(
          null,
          { email: 'x@x.com', password: 'Test1234' },
          { userId: '2', role: 'student' },
        ),
      ).rejects.toThrow('Forbidden');
    });

    it('admin creates user and returns token + user on success', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);
      mockArgon2Hash.mockResolvedValue('hashed-pw');
      mockPrismaInstance.user.create.mockResolvedValue(fakeUser);
      mockPrismaInstance.session.create.mockResolvedValue(fakeSession);

      const result = await capturedSchema.resolvers.Mutation.register(
        null,
        { email: 'new@example.com', password: 'Test1234', language: 'english' },
        adminCtx,
      );

      expect(mockPrismaInstance.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'new@example.com', role: 'student' }),
        }),
      );
      expect(result).toMatchObject({ token: 'signed-token', user: fakeUser });
    });

    it('throws when email is already in use', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(fakeUser);

      await expect(
        capturedSchema.resolvers.Mutation.register(
          null,
          { email: 'test@example.com', password: 'Test1234' },
          adminCtx,
        ),
      ).rejects.toThrow('Email already in use');
    });

    it('throws on invalid email format', async () => {
      await expect(
        capturedSchema.resolvers.Mutation.register(null, { email: 'not-an-email', password: 'Test1234' }, adminCtx),
      ).rejects.toThrow('Invalid email format');
    });

    it('throws on weak password (too short)', async () => {
      await expect(
        capturedSchema.resolvers.Mutation.register(null, { email: 'a@b.com', password: 'abc' }, adminCtx),
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('throws on password missing uppercase/digit', async () => {
      await expect(
        capturedSchema.resolvers.Mutation.register(null, { email: 'a@b.com', password: 'alllower1' }, adminCtx),
      ).rejects.toThrow('Password must include upper');
    });

    it('normalizes email to lowercase', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);
      mockArgon2Hash.mockResolvedValue('hash');
      mockPrismaInstance.user.create.mockResolvedValue(fakeUser);

      await capturedSchema.resolvers.Mutation.register(
        null,
        { email: 'UPPER@EXAMPLE.COM', password: 'Test1234' },
        adminCtx,
      );

      expect(mockPrismaInstance.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'upper@example.com' },
      });
    });
  });

  // ─── Mutation.login ───────────────────────────────────────────────────────

  describe('Mutation.login', () => {
    it('returns token + user for valid credentials', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(fakeUser);
      mockArgon2Verify.mockResolvedValue(true);
      mockPrismaInstance.session.create.mockResolvedValue(fakeSession);

      const result = await capturedSchema.resolvers.Mutation.login(
        null,
        { email: 'test@example.com', password: 'Test1234' },
      );

      expect(result).toMatchObject({ token: 'signed-token', user: fakeUser });
    });

    it('throws "Invalid credentials" when user does not exist', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await expect(
        capturedSchema.resolvers.Mutation.login(null, { email: 'none@example.com', password: 'Test1234' }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('throws "Invalid credentials" when password is wrong', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(fakeUser);
      mockArgon2Verify.mockResolvedValue(false);

      await expect(
        capturedSchema.resolvers.Mutation.login(null, { email: 'test@example.com', password: 'wrongpw' }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  // ─── Mutation.refreshToken ────────────────────────────────────────────────

  describe('Mutation.refreshToken', () => {
    it('returns new token after revoking the old session', async () => {
      mockJwtVerify.mockReturnValue({ id: '1' });
      mockPrismaInstance.session.findUnique.mockResolvedValue(fakeSession);
      mockPrismaInstance.user.findUnique.mockResolvedValue(fakeUser);
      mockPrismaInstance.session.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaInstance.session.create.mockResolvedValue(fakeSession);

      const result = await capturedSchema.resolvers.Mutation.refreshToken(null, { token: 'old-token' });

      expect(mockPrismaInstance.session.deleteMany).toHaveBeenCalledWith({ where: { token: 'old-token' } });
      expect(result).toMatchObject({ token: 'signed-token', user: fakeUser });
    });

    it('throws when the token is invalid', async () => {
      mockJwtVerify.mockImplementation(() => { throw new Error('jwt expired'); });

      await expect(
        capturedSchema.resolvers.Mutation.refreshToken(null, { token: 'expired-token' }),
      ).rejects.toThrow('jwt expired');
    });

    it('throws when user not found for the token payload', async () => {
      mockJwtVerify.mockReturnValue({ id: '99' });
      mockPrismaInstance.session.findUnique.mockResolvedValue(fakeSession);
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await expect(
        capturedSchema.resolvers.Mutation.refreshToken(null, { token: 'valid-tok' }),
      ).rejects.toThrow('User not found');
    });
  });

  // ─── Mutation.logout ──────────────────────────────────────────────────────

  describe('Mutation.logout', () => {
    it('deletes session and returns true', async () => {
      mockPrismaInstance.session.deleteMany.mockResolvedValue({ count: 1 });

      const result = await capturedSchema.resolvers.Mutation.logout(
        null,
        {},
        { token: 'my-token' },
      );

      expect(mockPrismaInstance.session.deleteMany).toHaveBeenCalledWith({ where: { token: 'my-token' } });
      expect(result).toBe(true);
    });

    it('returns true even when no token in context', async () => {
      const result = await capturedSchema.resolvers.Mutation.logout(null, {}, {});
      expect(mockPrismaInstance.session.deleteMany).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  // ─── Mutation.updateUserRole ──────────────────────────────────────────────

  describe('Mutation.updateUserRole', () => {
    it('admin can update user role', async () => {
      const updatedUser = { ...fakeUser, role: 'admin' };
      mockPrismaInstance.user.update.mockResolvedValue(updatedUser);

      const result = await capturedSchema.resolvers.Mutation.updateUserRole(
        null,
        { userId: '1', role: 'admin' },
        { userId: '2', role: 'admin' },
      );

      expect(mockPrismaInstance.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { role: 'admin' },
      });
      expect(result).toEqual(updatedUser);
    });

    it('throws Forbidden for non-admin', async () => {
      await expect(
        capturedSchema.resolvers.Mutation.updateUserRole(
          null,
          { userId: '5', role: 'admin' },
          { userId: '1', role: 'student' },
        ),
      ).rejects.toThrow('Forbidden');
    });

    it('throws when role is invalid', async () => {
      await expect(
        capturedSchema.resolvers.Mutation.updateUserRole(
          null,
          { userId: '5', role: 'superuser' },
          { userId: '1', role: 'admin' },
        ),
      ).rejects.toThrow('Role must be one of');
    });

    it('throws Unauthorized when context has no userId', async () => {
      await expect(
        capturedSchema.resolvers.Mutation.updateUserRole(null, { userId: '5', role: 'admin' }, {}),
      ).rejects.toThrow('Unauthorized');
    });
  });
});
