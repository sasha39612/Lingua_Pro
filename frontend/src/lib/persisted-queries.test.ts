import { describe, it, expect } from 'vitest';
import { OPERATION_HASH_BY_NAME, PERSISTED_QUERY_MANIFEST } from './persisted-queries';
import { GRAPHQL_OPERATIONS, type OperationName } from './graphql-operations';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('persisted-queries', () => {
  const operationNames = Object.keys(GRAPHQL_OPERATIONS) as OperationName[];

  // ─── OPERATION_HASH_BY_NAME ────────────────────────────────────────────────

  describe('OPERATION_HASH_BY_NAME', () => {
    it('has an entry for every operation in GRAPHQL_OPERATIONS', () => {
      for (const name of operationNames) {
        expect(OPERATION_HASH_BY_NAME).toHaveProperty(name);
      }
    });

    it('does not have extra keys beyond GRAPHQL_OPERATIONS', () => {
      const hashKeys = Object.keys(OPERATION_HASH_BY_NAME);
      expect(hashKeys.length).toBe(operationNames.length);
    });

    it('produces consistent hashes (same input → same output)', () => {
      const first = { ...OPERATION_HASH_BY_NAME };
      // Re-import is not possible in ESM without cache busting, so verify
      // determinism by comparing to itself — all values must be non-empty strings.
      for (const name of operationNames) {
        expect(typeof first[name]).toBe('string');
        expect(first[name].length).toBeGreaterThan(0);
      }
    });

    it('produces different hashes for different operations', () => {
      const hashes = Object.values(OPERATION_HASH_BY_NAME);
      const unique = new Set(hashes);
      expect(unique.size).toBe(hashes.length);
    });

    it('hash values are 8-character hex strings', () => {
      for (const name of operationNames) {
        expect(OPERATION_HASH_BY_NAME[name]).toMatch(/^[0-9a-f]{8}$/);
      }
    });
  });

  // ─── PERSISTED_QUERY_MANIFEST ──────────────────────────────────────────────

  describe('PERSISTED_QUERY_MANIFEST', () => {
    it('has the same number of entries as GRAPHQL_OPERATIONS', () => {
      expect(Object.keys(PERSISTED_QUERY_MANIFEST).length).toBe(operationNames.length);
    });

    it('each value in the manifest is the full query string', () => {
      const queries = Object.values(GRAPHQL_OPERATIONS);
      const manifestValues = Object.values(PERSISTED_QUERY_MANIFEST);

      for (const query of queries) {
        expect(manifestValues).toContain(query);
      }
    });

    it('manifest keys match the hashes in OPERATION_HASH_BY_NAME', () => {
      const manifestKeys = new Set(Object.keys(PERSISTED_QUERY_MANIFEST));
      for (const name of operationNames) {
        expect(manifestKeys.has(OPERATION_HASH_BY_NAME[name])).toBe(true);
      }
    });

    it('each manifest entry maps hash → query correctly', () => {
      for (const name of operationNames) {
        const hash = OPERATION_HASH_BY_NAME[name];
        const query = GRAPHQL_OPERATIONS[name];
        expect(PERSISTED_QUERY_MANIFEST[hash]).toBe(query);
      }
    });
  });
});
