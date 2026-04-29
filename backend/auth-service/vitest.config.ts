import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    env: {
      JWT_SECRET: 'test-secret',
      INTERNAL_SERVICE_SECRET: 'test-internal-secret',
    },
  },
});
