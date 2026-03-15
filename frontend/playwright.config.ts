import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : 'html',

  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    // Registers a student test user and saves auth state to playwright/.auth/user.json
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },

    // Registers an admin test user and saves auth state to playwright/.auth/admin.json
    {
      name: 'admin-setup',
      testMatch: /admin-setup\.ts/,
    },

    // Authenticated tests (non-admin) — depend on setup to run first
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /(?<!admin)\.spec\.ts$/,
    },

    // Admin tests — use admin auth state
    {
      name: 'chromium-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['admin-setup'],
      testMatch: /admin\.spec\.ts$/,
    },
  ],
});
