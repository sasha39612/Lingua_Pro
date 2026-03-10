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

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn(() => mockPrismaInstance) }));
vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: vi.fn() }));
vi.mock('pg', () => ({ Pool: vi.fn() }));
vi.mock('@apollo/subgraph', () => ({ buildSubgraphSchema: vi.fn(() => ({})) }));
vi.mock('graphql-tag', () => ({ gql: vi.fn((s: any) => s) }));
vi.mock('argon2', () => ({ hash: vi.fn(), verify: vi.fn() }));
vi.mock('jsonwebtoken', () => ({ verify: mockJwtVerify, sign: mockJwtSign }));

import { verifyToken } from './auth.schema';

// ─── Tests ────────────────────────────────────────────────────────────────────

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

    expect(mockJwtVerify).toHaveBeenCalledWith(fakeToken, expect.any(String));
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

  it('uses JWT_SECRET env variable', async () => {
    const orig = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'my-custom-secret';

    mockJwtVerify.mockReturnValue(fakePayload);
    mockPrismaInstance.session.findUnique.mockResolvedValue(fakeSession);

    await verifyToken(fakeToken);
    expect(mockJwtVerify).toHaveBeenCalledWith(fakeToken, 'my-custom-secret');

    process.env.JWT_SECRET = orig;
  });
});
