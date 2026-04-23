import type { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import * as Sentry from '@sentry/nestjs';

const SENSITIVE_VARS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'token',
  'authorization',
]);

function scrubVariables(
  variables: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!variables) return undefined;
  const scrubbed: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(variables)) {
    scrubbed[key] = SENSITIVE_VARS.has(key) ? '[Filtered]' : val;
  }
  return scrubbed;
}

export const SentryApolloPlugin: ApolloServerPlugin = {
  async requestDidStart(): Promise<GraphQLRequestListener<Record<string, unknown>>> {
    return {
      async didEncounterErrors({ errors, operation, request }) {
        for (const err of errors) {
          if (err.extensions?.['code'] === 'INTERNAL_SERVER_ERROR') {
            Sentry.captureException(err.originalError ?? err, {
              extra: {
                operationName: operation?.name?.value ?? request.operationName ?? 'unknown',
                variables: scrubVariables(
                  request.variables as Record<string, unknown> | undefined,
                ),
              },
            });
          }
        }
      },
    };
  },
};
