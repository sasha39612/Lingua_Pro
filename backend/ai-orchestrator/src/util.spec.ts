import { describe, it, expect, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { withRetry, withRetryTracked } from './util';

const logger = new Logger('test');

describe('withRetry — NormalizedError fail-fast behaviour', () => {
  it('does not retry on quota error', async () => {
    const fn = vi.fn().mockRejectedValue(
      Object.assign(new Error('exceeded your current quota'), { status: 429 }),
    );
    await expect(withRetry(fn, 'test', logger)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1); // fail fast, no retries
  });

  it('does not retry on parse error (SyntaxError)', async () => {
    const fn = vi.fn().mockRejectedValue(new SyntaxError('Unexpected token'));
    await expect(withRetry(fn, 'test', logger)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry on unknown error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('some unknown issue'));
    await expect(withRetry(fn, 'test', logger)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry on 403 (client fault)', async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }));
    await expect(withRetry(fn, 'test', logger)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries up to 3x on transient network error', async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 3) throw new Error('fetch failed: ECONNREFUSED');
      return 'ok';
    });
    const result = await withRetry(fn, 'test', logger, 3, 1);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('retries on 503 (service unavailable)', async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 2) throw Object.assign(new Error('Service Unavailable'), { status: 503 });
      return 'ok';
    });
    const result = await withRetry(fn, 'test', logger, 3, 1);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on timeout', async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 2) throw new Error('Request timeout after 15000ms');
      return 'ok';
    });
    const result = await withRetry(fn, 'test', logger, 3, 1);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries rate_limit up to maxAttempts', async () => {
    const fn = vi.fn().mockRejectedValue(
      Object.assign(new Error('Too Many Requests'), { status: 429 }),
    );
    await expect(withRetry(fn, 'test', logger, 3, 1)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('withRetryTracked', () => {
  it('returns attempts count', async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 2) throw new Error('fetch failed: ECONNREFUSED');
      return 'value';
    });
    const { result, attempts } = await withRetryTracked(fn, 'test', logger, 3, 1);
    expect(result).toBe('value');
    expect(attempts).toBe(2);
  });
});
