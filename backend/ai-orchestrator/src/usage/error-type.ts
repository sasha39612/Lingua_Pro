export const ErrorType = {
  TIMEOUT:                    'timeout',
  QUOTA:                      'quota',
  RATE_LIMIT:                 'rate_limit',
  NETWORK:                    'network',
  PARSE_ERROR:                'parse_error',
  AZURE_UNSUPPORTED_LANGUAGE: 'azure_unsupported_language',
  SERVICE_UNAVAILABLE:        'service_unavailable',
  UNKNOWN:                    'unknown',
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

/**
 * Normalized error contract returned by classifyError().
 * withRetry uses `retryable` to decide whether to retry — callers never need
 * to maintain their own allow/deny lists.
 * `backoffMs` is set when the provider returns a Retry-After header; withRetry
 * uses it as the wait floor (+ jitter) instead of the exponential formula.
 */
export type NormalizedError = {
  type: ErrorType;
  retryable: boolean;
  backoffMs?: number;    // ms to wait before next attempt (from Retry-After header)
  originalError: unknown;
};

/**
 * Rule of thumb: only retry what is confidently transient. When in doubt, fail fast.
 *
 * | type                      | retryable | reason                                          |
 * |---------------------------|-----------|-------------------------------------------------|
 * | quota                     | false     | billing cap won't clear in seconds              |
 * | rate_limit                | true      | short-lived throttle; use Retry-After if given  |
 * | transient / network       | true      | temporary connectivity issue                    |
 * | timeout                   | true      | may be a slow server spike                      |
 * | service_unavailable (503) | true      | temporary server overload                       |
 * | parse_error               | false     | retrying same prompt rarely heals JSON output   |
 * | azure_unsupported         | false     | unsupported locale; fall to Whisper immediately |
 * | unknown                   | false     | auth errors, 4xx, bugs — retrying hides issues  |
 */
export function classifyError(err: unknown): NormalizedError {
  // ── Try to read Retry-After header (OpenAI SDK: err.headers; Azure: varies) ──
  let retryAfterMs: number | undefined;
  if (err != null && typeof err === 'object') {
    const headers = (err as Record<string, unknown>).headers;
    if (headers != null && typeof headers === 'object') {
      const raw =
        typeof (headers as { get?: (k: string) => string | null }).get === 'function'
          ? (headers as { get: (k: string) => string | null }).get('retry-after')
          : ((headers as Record<string, unknown>)['retry-after'] as string | undefined) ?? null;
      if (raw) {
        const parsed = parseFloat(raw);
        if (!Number.isNaN(parsed) && parsed > 0) retryAfterMs = parsed * 1000;
      }
    }

    // ── HTTP status-code classification (OpenAI SDK: err.status) ──────────────
    const status = (err as Record<string, unknown>).status;
    if (typeof status === 'number') {
      if (status === 429) {
        const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
        const isQuotaExhausted =
          msg.includes('quota') || msg.includes('billing') || msg.includes('exceeded your current quota');
        if (isQuotaExhausted) {
          return { type: ErrorType.QUOTA, retryable: false, originalError: err };
        }
        return { type: ErrorType.RATE_LIMIT, retryable: true, backoffMs: retryAfterMs, originalError: err };
      }
      if (status === 503) {
        return { type: ErrorType.SERVICE_UNAVAILABLE, retryable: true, originalError: err };
      }
      if (status >= 400 && status < 500) {
        // Other 4xx (401, 403, 400, 404…) — client fault, never transient
        return { type: ErrorType.UNKNOWN, retryable: false, originalError: err };
      }
      if (status >= 500) {
        // Other 5xx — server-side transient
        return { type: ErrorType.NETWORK, retryable: true, originalError: err };
      }
    }
  }

  // ── Message-string classification (fallback for SDK errors without .status) ──
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('timeout'))                                    return { type: ErrorType.TIMEOUT, retryable: true, originalError: err };
    if (msg.includes('rate limit') || msg.includes('rate_limit') || msg.includes('ratelimit')) {
      return { type: ErrorType.RATE_LIMIT, retryable: true, backoffMs: retryAfterMs, originalError: err };
    }
    if (msg.includes('quota') || msg.includes('billing'))          return { type: ErrorType.QUOTA, retryable: false, originalError: err };
    if (msg.includes('network') || msg.includes('econnrefused') || msg.includes('fetch')) {
      return { type: ErrorType.NETWORK, retryable: true, originalError: err };
    }
    if (msg.includes('unsupported'))                               return { type: ErrorType.AZURE_UNSUPPORTED_LANGUAGE, retryable: false, originalError: err };
    if (err.name === 'SyntaxError')                                return { type: ErrorType.PARSE_ERROR, retryable: false, originalError: err };
  }

  // Unknown — fail fast; retrying auth errors, malformed requests, and bugs hides root causes
  return { type: ErrorType.UNKNOWN, retryable: false, originalError: err };
}
