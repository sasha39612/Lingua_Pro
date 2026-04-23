import * as Sentry from '@sentry/nextjs';
import { GRAPHQL_OPERATIONS, OperationName } from '@/lib/graphql-operations';
import { OPERATION_HASH_BY_NAME } from '@/lib/persisted-queries';

interface GraphQLResponse<TData> {
  data?: TData;
  errors?: Array<{ message: string }>;
}

interface RequestOptions<TVariables> {
  operationName: OperationName;
  variables?: TVariables;
  token?: string | null;
}

export async function graphqlRequest<TData, TVariables = Record<string, unknown>>(
  options: RequestOptions<TVariables>,
): Promise<TData> {
  const { operationName, variables, token } = options;
  const sha256Hash = OPERATION_HASH_BY_NAME[operationName];

  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      operationName,
      variables,
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash,
        },
      },
    }),
    cache: 'no-store',
  });

  const payload = (await response.json()) as GraphQLResponse<TData>;

  if (payload.errors?.length) {
    const error = new Error(payload.errors.map((e) => e.message).join('; '));
    Sentry.captureException(error, { extra: { operationName } });
    throw error;
  }

  if (!payload.data) {
    const fallback = await fetch('/api/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        operationName,
        query: GRAPHQL_OPERATIONS[operationName],
        variables,
      }),
      cache: 'no-store',
    });

    const fallbackPayload = (await fallback.json()) as GraphQLResponse<TData>;
    if (fallbackPayload.errors?.length) {
      const error = new Error(fallbackPayload.errors.map((e) => e.message).join('; '));
      Sentry.captureException(error, { extra: { operationName } });
      throw error;
    }
    if (!fallbackPayload.data) {
      const error = new Error('GraphQL returned empty payload');
      Sentry.captureException(error, { extra: { operationName } });
      throw error;
    }
    return fallbackPayload.data;
  }

  return payload.data;
}
