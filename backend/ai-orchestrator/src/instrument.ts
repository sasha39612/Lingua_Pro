import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  beforeSend(event) {
    if (event.request?.headers && typeof event.request.headers === 'object') {
      const headers = event.request.headers as Record<string, unknown>;
      if ('authorization' in headers) headers['authorization'] = '[Filtered]';
      if ('x-internal-token' in headers) headers['x-internal-token'] = '[Filtered]';
    }
    return event;
  },
});
