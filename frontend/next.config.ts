import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  silent: true,
  sourcemaps: {
    // Upload source maps to Sentry then delete them from the build output
    // so they are never served to the browser.
    deleteSourcemapsAfterUpload: true,
  },
});
