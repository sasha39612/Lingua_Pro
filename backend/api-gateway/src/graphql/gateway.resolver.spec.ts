import { vi } from 'vitest';

vi.mock('@nestjs/graphql', () => ({
  Query: () => () => {},
  Resolver: () => (target: any) => target,
}));

import { GatewayResolver } from './gateway.resolver';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GatewayResolver', () => {
  let resolver: GatewayResolver;

  beforeEach(() => {
    resolver = new GatewayResolver();
  });

  describe('hello', () => {
    it('returns a non-empty string', () => {
      const result = resolver.hello();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('mentions Lingua Pro or API Gateway', () => {
      const result = resolver.hello();
      expect(result).toMatch(/Lingua|Gateway/i);
    });
  });

  describe('healthGraph', () => {
    it('returns "ok"', () => {
      const result = resolver.healthGraph();
      expect(result).toBe('ok');
    });
  });
});
