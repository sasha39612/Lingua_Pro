// Captures errors from nested React Server Components
export { captureRequestError as onRequestError } from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 1.0,
      beforeSend(event) {
        if (event.request?.headers && typeof event.request.headers === 'object') {
          const headers = event.request.headers as Record<string, unknown>;
          for (const key of ['authorization', 'cookie', 'x-internal-token']) {
            if (key in headers) headers[key] = '[Filtered]';
          }
        }
        if (event.request?.data && typeof event.request.data === 'object') {
          const data = event.request.data as Record<string, unknown>;
          for (const key of ['password', 'token', 'newPassword', 'currentPassword']) {
            if (key in data) data[key] = '[Filtered]';
          }
        }
        return event;
      },
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 1.0,
    });
  }
}
