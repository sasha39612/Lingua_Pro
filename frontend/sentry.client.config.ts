import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  beforeSend(event) {
    // Scrub sensitive fields from request body
    if (event.request?.data && typeof event.request.data === 'object') {
      const data = event.request.data as Record<string, unknown>;
      for (const key of ['password', 'token', 'authorization', 'newPassword', 'currentPassword']) {
        if (key in data) data[key] = '[Filtered]';
      }
    }
    return event;
  },
});
