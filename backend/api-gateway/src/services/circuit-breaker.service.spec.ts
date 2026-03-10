import { vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@nestjs/common', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    Logger: vi.fn(function () {
      return { warn: vi.fn(), log: vi.fn(), error: vi.fn() };
    }),
    Injectable: () => (target: any) => target,
  };
});

import { CircuitBreakerService } from './circuit-breaker.service';

// ─── Tests ────────────────────────────────────────────────────────────────────
// Tested through public API — avoids fragile opossum internals mocking.

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    service = new CircuitBreakerService();
  });

  it('returns result of a successful operation', async () => {
    const result = await service.execute(() => Promise.resolve('hello'));
    expect(result).toBe('hello');
  });

  it('passes resolved numeric value through', async () => {
    const result = await service.execute(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('invokes fallback when the operation throws', async () => {
    const result = await service.execute(
      () => Promise.reject(new Error('service down')),
      () => 'fallback-value',
    );
    expect(result).toBe('fallback-value');
  });

  it('propagates rejection when no fallback is provided', async () => {
    await expect(
      service.execute(() => Promise.reject(new Error('boom'))),
    ).rejects.toThrow();
  });

  it('returns resolved value from async fallback', async () => {
    const result = await service.execute(
      () => Promise.reject(new Error('down')),
      () => Promise.resolve('async-fallback'),
    );
    expect(result).toBe('async-fallback');
  });
});
