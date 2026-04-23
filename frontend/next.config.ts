import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Content-Security-Policy
// script-src: 'unsafe-inline' is required because Next.js injects inline hydration
// scripts. 'unsafe-eval' is added only in development for HMR.
// When a strict nonce-based CSP is needed in future, see:
//   https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
const isDev = process.env.NODE_ENV === 'development';

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // All API/GraphQL calls go through Next.js /api/* proxy routes (same-origin).
  // ws:/wss: is included for Next.js HMR websocket in development.
  `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
  // audio/video blobs created by MediaRecorder for speaking/listening features
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // microphone=(self) is required for the speaking/pronunciation recorder.
    value: 'camera=(), geolocation=(), payment=(), microphone=(self)',
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  silent: true,
  sourcemaps: {
    // Upload source maps to Sentry then delete them from the build output
    // so they are never served to the browser.
    deleteSourcemapsAfterUpload: true,
  },
});
