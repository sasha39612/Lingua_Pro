import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.join(__dirname, '../playwright/.auth/user.json');

// Unique email per run so parallel CI jobs don't conflict
const TEST_EMAIL = `e2e.${Date.now()}@lingua.test`;
const TEST_PASSWORD = 'Test1234!';

setup('register and authenticate test user', async ({ page, request }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  // Register directly against the API Gateway (not via Next.js proxy) so the
  // setup step works even if the frontend container is still starting.
  const registerResp = await request.post('http://localhost:8080/graphql', {
    data: {
      query: `mutation {
        register(email: "${TEST_EMAIL}", password: "${TEST_PASSWORD}") {
          token
          user { id email }
        }
      }`,
    },
  });

  const body = (await registerResp.json()) as {
    data?: { register?: { token?: string } };
    errors?: { message: string }[];
  };

  if (!body?.data?.register?.token) {
    throw new Error(`Registration failed: ${JSON.stringify(body)}`);
  }

  // Log in via the UI so Zustand persists token + user to localStorage,
  // then save the full browser storage state for reuse in all spec files.
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/dashboard');

  await page.context().storageState({ path: AUTH_FILE });
});
