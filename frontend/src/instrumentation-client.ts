import * as Sentry from '@sentry/nextjs';

// Instruments client-side navigations for Sentry performance tracing
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Route browser events through our own domain to avoid ad-blocker drops
  // and CSP issues with sentry.io being blocked.
  tunnel: '/api/sentry-tunnel',
  tracesSampleRate: 1.0,
  beforeSend(event) {
    if (event.request?.data && typeof event.request.data === 'object') {
      const data = event.request.data as Record<string, unknown>;
      for (const key of ['password', 'token', 'authorization', 'newPassword', 'currentPassword']) {
        if (key in data) data[key] = '[Filtered]';
      }
    }
    return event;
  },
});
