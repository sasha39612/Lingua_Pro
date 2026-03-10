import { vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockConnect = vi.hoisted(() => vi.fn());
const mockDisconnect = vi.hoisted(() => vi.fn());
const mockPoolEnd = vi.hoisted(() => vi.fn());
const MockPool = vi.hoisted(() =>
  vi.fn(function (this: any, opts: any) {
    this._opts = opts;
    this.end = mockPoolEnd;
  }),
);

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(function (this: any) {
    this.$connect = mockConnect;
    this.$disconnect = mockDisconnect;
  }),
}));

vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: vi.fn(function () {}) }));
vi.mock('pg', () => ({ Pool: MockPool }));
vi.mock('dotenv', () => ({ config: vi.fn() }));

import { PrismaService } from './prisma.service';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PrismaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls $connect on onModuleInit', async () => {
    const service = new PrismaService();
    mockConnect.mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('calls $disconnect and pool.end on onModuleDestroy', async () => {
    const service = new PrismaService();
    mockDisconnect.mockResolvedValue(undefined);
    mockPoolEnd.mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockPoolEnd).toHaveBeenCalledTimes(1);
  });

  it('uses DATABASE_URL env variable when set', () => {
    const orig = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://custom:pw@host:5432/mydb';

    new PrismaService();

    expect(MockPool).toHaveBeenCalledWith(
      expect.objectContaining({ connectionString: 'postgresql://custom:pw@host:5432/mydb' }),
    );

    process.env.DATABASE_URL = orig;
  });

  it('falls back to default connection string when DATABASE_URL is not set', () => {
    const orig = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    MockPool.mockClear();
    new PrismaService();

    expect(MockPool).toHaveBeenCalledWith(
      expect.objectContaining({ connectionString: expect.stringContaining('localhost') }),
    );

    process.env.DATABASE_URL = orig;
  });
});
