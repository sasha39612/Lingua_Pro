import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_AUTH_FILE = path.join(__dirname, '../playwright/.auth/admin.json');

const TEST_EMAIL = `e2e.admin.${Date.now()}@lingua.test`;
const TEST_PASSWORD = 'Test1234!';

setup('register and authenticate admin test user', async ({ page, request }) => {
  fs.mkdirSync(path.dirname(ADMIN_AUTH_FILE), { recursive: true });

  const registerResp = await request.post('http://localhost:8080/graphql', {
    data: {
      query: `mutation {
        register(email: "${TEST_EMAIL}", password: "${TEST_PASSWORD}") {
          token
          user { id email role language }
        }
      }`,
    },
  });

  const body = (await registerResp.json()) as {
    data?: { register?: { token?: string; user?: { id: string; email: string; role: string; language: string } } };
    errors?: { message: string }[];
  };

  if (!body?.data?.register?.token || !body?.data?.register?.user) {
    throw new Error(`Admin registration failed: ${JSON.stringify(body)}`);
  }

  const { token, user } = body.data.register;

  // Override role to 'admin' in client-side state — the admin page only
  // checks the Zustand store role, not a server-side session claim.
  await page.goto('/');
  await page.evaluate(
    ({ authToken, authUser, storageKey }) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          state: {
            token: authToken,
            user: { ...authUser, role: 'admin' },
            language: 'English',
            level: 'B2',
            theme: 'system',
            lastTaskTitle: null,
          },
          version: 0,
        }),
      );
    },
    { authToken: token, authUser: user, storageKey: 'lingua-pro-zustand' },
  );

  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');

  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});
