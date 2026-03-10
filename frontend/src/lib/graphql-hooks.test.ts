import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Capture the config object passed to useMutation / useQuery so we can
// exercise the mutationFn / queryFn directly without a React tree.
const capturedMutation = vi.hoisted(() => ({ config: null as any }));
const capturedQuery = vi.hoisted(() => ({ config: null as any }));

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((config: any) => {
    capturedMutation.config = config;
    return { mutateAsync: (vars: any) => config.mutationFn(vars) };
  }),
  useQuery: vi.fn((config: any) => {
    capturedQuery.config = config;
    return { data: undefined, isLoading: false };
  }),
}));

const mockGraphqlRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/graphql-client', () => ({ graphqlRequest: mockGraphqlRequest }));

vi.mock('@/lib/persisted-queries', () => ({
  OPERATION_HASH_BY_NAME: {
    Register: 'reg-hash',
    Login: 'login-hash',
    Me: 'me-hash',
    CheckText: 'check-hash',
    Tasks: 'tasks-hash',
    Texts: 'texts-hash',
  },
}));

vi.mock('@/lib/graphql-operations', () => ({
  GRAPHQL_OPERATIONS: {
    Register: 'mutation Register { ... }',
    Login: 'mutation Login { ... }',
    Me: 'query Me { ... }',
    CheckText: 'mutation CheckText { ... }',
    Tasks: 'query Tasks { ... }',
    Texts: 'query Texts { ... }',
  },
}));

import {
  useRegisterMutation,
  useLoginMutation,
  useCheckTextMutation,
  useTasksQuery,
  useTextsQuery,
  useMeQuery,
} from './graphql-hooks';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('graphql-hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedMutation.config = null;
    capturedQuery.config = null;
  });

  // ─── useRegisterMutation ───────────────────────────────────────────────────

  describe('useRegisterMutation', () => {
    it('calls graphqlRequest with Register operation and variables', async () => {
      mockGraphqlRequest.mockResolvedValue({ register: { token: 'tok', user: {} } });
      useRegisterMutation();

      await capturedMutation.config.mutationFn({
        variables: { email: 'a@b.com', password: 'pass', language: 'english' },
        token: null,
      });

      expect(mockGraphqlRequest).toHaveBeenCalledWith({
        operationName: 'Register',
        variables: { email: 'a@b.com', password: 'pass', language: 'english' },
        token: null,
      });
    });
  });

  // ─── useLoginMutation ──────────────────────────────────────────────────────

  describe('useLoginMutation', () => {
    it('calls graphqlRequest with Login operation', async () => {
      mockGraphqlRequest.mockResolvedValue({ login: { token: 'jwt', user: {} } });
      useLoginMutation();

      await capturedMutation.config.mutationFn({
        variables: { email: 'x@y.com', password: 'secret' },
        token: undefined,
      });

      expect(mockGraphqlRequest).toHaveBeenCalledWith({
        operationName: 'Login',
        variables: { email: 'x@y.com', password: 'secret' },
        token: undefined,
      });
    });

    it('returns the graphqlRequest result', async () => {
      const expected = { login: { token: 'returned-token', user: { id: 1 } } };
      mockGraphqlRequest.mockResolvedValue(expected);
      useLoginMutation();

      const result = await capturedMutation.config.mutationFn({
        variables: { email: 'x@y.com', password: 'pass' },
      });

      expect(result).toEqual(expected);
    });
  });

  // ─── useCheckTextMutation ──────────────────────────────────────────────────

  describe('useCheckTextMutation', () => {
    it('calls graphqlRequest with CheckText operation', async () => {
      mockGraphqlRequest.mockResolvedValue({ checkText: { id: 1 } });
      useCheckTextMutation();

      const variables = { input: { userId: '1', language: 'English', text: 'Hello' } };
      await capturedMutation.config.mutationFn({ variables, token: 'my-token' });

      expect(mockGraphqlRequest).toHaveBeenCalledWith({
        operationName: 'CheckText',
        variables,
        token: 'my-token',
      });
    });
  });

  // ─── useTasksQuery ─────────────────────────────────────────────────────────

  describe('useTasksQuery', () => {
    it('sets correct queryKey with language, level, skill', () => {
      useTasksQuery({
        enabled: true,
        variables: { language: 'English', level: 'B1', skill: 'reading' },
        token: 'tok',
      });

      expect(capturedQuery.config.queryKey).toEqual(['tasks', 'English', 'B1', 'reading']);
    });

    it('calls graphqlRequest with Tasks operation in queryFn', async () => {
      mockGraphqlRequest.mockResolvedValue({ tasks: [] });
      useTasksQuery({
        enabled: true,
        variables: { language: 'German', level: 'A2' },
        token: null,
      });

      await capturedQuery.config.queryFn();

      expect(mockGraphqlRequest).toHaveBeenCalledWith({
        operationName: 'Tasks',
        variables: { language: 'German', level: 'A2' },
        token: null,
      });
    });

    it('passes enabled flag through', () => {
      useTasksQuery({ enabled: false, variables: { language: 'English', level: 'A1' } });
      expect(capturedQuery.config.enabled).toBe(false);
    });
  });

  // ─── useTextsQuery ─────────────────────────────────────────────────────────

  describe('useTextsQuery', () => {
    it('sets queryKey with userId', () => {
      useTextsQuery({ enabled: true, variables: { userId: '42' }, token: 'tok' });
      expect(capturedQuery.config.queryKey).toEqual(['texts', '42']);
    });

    it('calls graphqlRequest with Texts operation in queryFn', async () => {
      mockGraphqlRequest.mockResolvedValue({ texts: [] });
      useTextsQuery({ enabled: true, variables: { userId: '7' }, token: 'tok' });

      await capturedQuery.config.queryFn();

      expect(mockGraphqlRequest).toHaveBeenCalledWith({
        operationName: 'Texts',
        variables: { userId: '7' },
        token: 'tok',
      });
    });
  });

  // ─── useMeQuery ────────────────────────────────────────────────────────────

  describe('useMeQuery', () => {
    it('sets queryKey with token', () => {
      useMeQuery({ enabled: true, token: 'abc' });
      expect(capturedQuery.config.queryKey).toEqual(['me', 'abc']);
    });

    it('calls graphqlRequest with Me operation in queryFn', async () => {
      mockGraphqlRequest.mockResolvedValue({ me: { id: 1 } });
      useMeQuery({ enabled: true, token: 'jwt-tok' });

      await capturedQuery.config.queryFn();

      expect(mockGraphqlRequest).toHaveBeenCalledWith({
        operationName: 'Me',
        token: 'jwt-tok',
      });
    });

    it('passes enabled flag through', () => {
      useMeQuery({ enabled: false, token: null });
      expect(capturedQuery.config.enabled).toBe(false);
    });

    it('queryKey includes null token when no token provided', () => {
      useMeQuery({ enabled: true, token: null });
      expect(capturedQuery.config.queryKey).toEqual(['me', null]);
    });
  });
});
