import { GRAPHQL_OPERATIONS, OperationName } from '@/lib/graphql-operations';

const operationEntries = Object.entries(GRAPHQL_OPERATIONS) as [OperationName, string][];

function fastHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export const PERSISTED_QUERY_MANIFEST: Record<string, string> = Object.fromEntries(
  operationEntries.map(([name, query]) => [fastHash(`${name}:${query}`), query]),
);

export const OPERATION_HASH_BY_NAME: Record<OperationName, string> = Object.fromEntries(
  operationEntries.map(([name, query]) => [name, fastHash(`${name}:${query}`)]),
) as Record<OperationName, string>;
