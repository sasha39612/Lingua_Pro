import { vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGqlCreate = vi.hoisted(() => vi.fn());

vi.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: { create: mockGqlCreate },
}));

vi.mock('@nestjs/throttler', () => ({
  ThrottlerGuard: class {
    protected getRequestResponse(_ctx: any) { return {}; }
  },
}));

import { GqlThrottlerGuard } from './gql-throttler.guard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGuard() {
  return new GqlThrottlerGuard({} as any, {} as any, {} as any);
}

function makeHttpContext(req = {}, res = {}): any {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  };
}

function makeGqlContext(): any {
  return {
    getType: () => 'graphql',
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GqlThrottlerGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts req/res from HTTP context', () => {
    const guard = makeGuard();
    const fakeReq = { ip: '127.0.0.1' };
    const fakeRes = { statusCode: 200 };
    const ctx = makeHttpContext(fakeReq, fakeRes);

    const result = (guard as any).getRequestResponse(ctx);

    expect(result.req).toBe(fakeReq);
    expect(result.res).toBe(fakeRes);
  });

  it('extracts req/res from GraphQL context', () => {
    const guard = makeGuard();
    const fakeReq = { headers: {} };
    const fakeRes = {};

    mockGqlCreate.mockReturnValue({
      getContext: () => ({ req: fakeReq, res: fakeRes }),
    });

    const ctx = makeGqlContext();
    const result = (guard as any).getRequestResponse(ctx);

    expect(result.req).toBe(fakeReq);
    expect(result.res).toBe(fakeRes);
    expect(mockGqlCreate).toHaveBeenCalledWith(ctx);
  });
});
