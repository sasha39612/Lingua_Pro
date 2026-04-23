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
  hideSourceMaps: true,
  disableLogger: true,
});
