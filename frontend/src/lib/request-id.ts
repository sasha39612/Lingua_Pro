/**
 * Generates a unique request ID for correlating frontend API calls with
 * backend AI usage log entries. Pass as `x-request-id` on all outbound
 * fetches from Next.js API routes.
 */
export function generateRequestId(): string {
  return 'req-' + crypto.randomUUID();
}
