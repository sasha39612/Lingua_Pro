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
    throw new Error(`Registration failed: ${JSON.stringify(body)}`);
  }

  const { token, user } = body.data.register;

  // Verify checkText mutation works directly against the API gateway.
  // This surfaces backend errors immediately in CI logs before browser tests run.
  const checkResp = await request.post('http://localhost:8080/graphql', {
    data: {
      query: `mutation {
        checkText(input: { userId: "${user.id}", language: "English", text: "She go to the store yesterday." }) {
          id feedback
        }
      }`,
    },
    headers: { Authorization: `Bearer ${token}` },
  });
  const checkBody = (await checkResp.json()) as { data?: { checkText?: { id: string } }; errors?: { message: string }[] };
  if (checkBody?.errors?.length) {
    throw new Error(`checkText mutation failed: ${JSON.stringify(checkBody.errors)}`);
  }
  if (!checkBody?.data?.checkText?.id) {
    throw new Error(`checkText returned unexpected response: ${JSON.stringify(checkBody)}`);
  }

  // Inject auth state directly into localStorage — more reliable than driving the
  // login form in CI (avoids hydration timing and SPA navigation edge cases).
  await page.goto('/');
  await page.evaluate(
    ({ authToken, authUser, storageKey }) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          state: {
            token: authToken,
            user: authUser,
            language: 'English',
            level: 'A2',
            theme: 'system',
            lastTaskTitle: null,
          },
          version: 0,
        }),
      );
    },
    { authToken: token, authUser: user, storageKey: 'lingua-pro-zustand' },
  );

  // Verify the injected state works by navigating to the dashboard.
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');

  await page.context().storageState({ path: AUTH_FILE });
});
