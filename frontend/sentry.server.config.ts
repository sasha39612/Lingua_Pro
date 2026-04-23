import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  beforeSend(event) {
    // Scrub sensitive headers
    if (event.request?.headers && typeof event.request.headers === 'object') {
      const headers = event.request.headers as Record<string, unknown>;
      for (const key of ['authorization', 'cookie', 'x-internal-token']) {
        if (key in headers) headers[key] = '[Filtered]';
      }
    }
    // Scrub sensitive body fields
    if (event.request?.data && typeof event.request.data === 'object') {
      const data = event.request.data as Record<string, unknown>;
      for (const key of ['password', 'token', 'newPassword', 'currentPassword']) {
        if (key in data) data[key] = '[Filtered]';
      }
    }
    return event;
  },
});
