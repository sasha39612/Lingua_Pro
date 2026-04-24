import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkOrigin } from './csrf-guard';

function makeRequest(origin: string | null): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (origin !== null) headers.set('origin', origin);
  return new Request('http://localhost/api/test', { method: 'POST', headers });
}

describe('checkOrigin', () => {
  const originalEnv = process.env.ALLOWED_ORIGINS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ALLOWED_ORIGINS;
    } else {
      process.env.ALLOWED_ORIGINS = originalEnv;
    }
  });

  describe('default allowed origins (no env var)', () => {
    beforeEach(() => {
      delete process.env.ALLOWED_ORIGINS;
    });

    it('returns null for same-origin request (localhost:3000)', () => {
      const result = checkOrigin(makeRequest('http://localhost:3000') as never);
      expect(result).toBeNull();
    });

    it('returns 403 for a cross-origin request', () => {
      const result = checkOrigin(makeRequest('https://evil.com') as never);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);
    });

    it('returns null when Origin header is absent (non-browser clients)', () => {
      const result = checkOrigin(makeRequest(null) as never);
      expect(result).toBeNull();
    });
  });

  describe('custom ALLOWED_ORIGINS env var', () => {
    beforeEach(() => {
      process.env.ALLOWED_ORIGINS = 'https://lingua.example.com,https://app.example.com';
    });

    it('allows a listed origin', () => {
      expect(checkOrigin(makeRequest('https://lingua.example.com') as never)).toBeNull();
      expect(checkOrigin(makeRequest('https://app.example.com') as never)).toBeNull();
    });

    it('blocks an unlisted origin', () => {
      const result = checkOrigin(makeRequest('https://evil.com') as never);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);
    });

    it('blocks localhost:3000 when not in the custom list', () => {
      const result = checkOrigin(makeRequest('http://localhost:3000') as never);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);
    });
  });
});
