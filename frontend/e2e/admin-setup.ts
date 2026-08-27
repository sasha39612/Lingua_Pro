import { test as setup } from '@playwright/test';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_AUTH_FILE = path.join(__dirname, '../playwright/.auth/admin.json');
const REPO_ROOT = path.join(__dirname, '../..');

const TEST_EMAIL = `e2e.admin.${Date.now()}@lingua.test`;
const TEST_PASSWORD = 'Test1234!';

setup('register and authenticate admin test user', async ({ page, request }) => {
  fs.mkdirSync(path.dirname(ADMIN_AUTH_FILE), { recursive: true });

  // register is invite-only — bootstrap the test user by calling auth-service
  // directly with internal-service credentials, bypassing the API Gateway
  // (which does not forward x-internal-token/x-internal-service to subgraphs).
  const registerResp = await request.post('http://localhost:4001/graphql', {
    data: {
      query: `mutation {
        register(email: "${TEST_EMAIL}", password: "${TEST_PASSWORD}") {
          token
          user { id email role language }
        }
      }`,
    },
    headers: {
      'x-internal-token': process.env.INTERNAL_SERVICE_SECRET ?? '',
      'x-internal-service': 'e2e-test',
    },
  });

  const body = (await registerResp.json()) as {
    data?: { register?: { token?: string; user?: { id: string; email: string; role: string; language: string } } };
    errors?: { message: string }[];
  };

  if (!body?.data?.register?.token || !body?.data?.register?.user) {
    throw new Error(`Admin registration failed: ${JSON.stringify(body)}`);
  }

  // register always creates a 'student' — there is no API path to create an
  // admin directly (updateUserRole itself requires an existing admin JWT).
  // Promote the row directly in Postgres, then re-authenticate so the new
  // JWT (and the `me` query dashboard.tsx hydrates from) both carry
  // role: 'admin'. A client-side-only override doesn't survive navigation:
  // dashboard.tsx's meQuery sync overwrites the Zustand user with the
  // server-authoritative role on every mount.
  execFileSync(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'postgres',
      'sh',
      '-c',
      `psql -U "$POSTGRES_USER" -d auth_db -c "UPDATE users SET role = 'admin' WHERE email = '${TEST_EMAIL}';"`,
    ],
    { cwd: REPO_ROOT, stdio: 'inherit' },
  );

  // Log in through the real Next.js route (not the auth-service directly) so
  // the browser gets the httpOnly `auth-token` cookie that graphql-client.ts
  // relies on — admin-page.tsx's data fetches (useAdminStats/useAdminUsers)
  // 401 without it, unlike the rest of the dashboard which tolerates a failed
  // `me` query by falling back to the Zustand-cached user.
  const loginResp = await request.post('http://localhost:3000/api/auth/login', {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });

  const loginBody = (await loginResp.json()) as {
    user?: { id: string; email: string; role: string; language: string };
    error?: string;
  };

  if (!loginResp.ok() || loginBody.user?.role !== 'admin') {
    throw new Error(`Admin promotion failed: ${JSON.stringify(loginBody)}`);
  }

  const setCookieHeader = loginResp
    .headersArray()
    .find((h) => h.name.toLowerCase() === 'set-cookie')?.value;
  const cookieMatch = setCookieHeader?.match(/auth-token=([^;]+)/);
  if (!cookieMatch) {
    throw new Error(`Login response did not set auth-token cookie: ${setCookieHeader}`);
  }

  await page.context().addCookies([
    {
      name: 'auth-token',
      value: cookieMatch[1],
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);

  await page.goto('/');
  await page.evaluate(
    ({ authUser, storageKey }) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          state: {
            user: authUser,
            language: 'English',
            level: 'B2',
            theme: 'system',
            lastTaskTitle: null,
          },
          version: 0,
        }),
      );
    },
    { authUser: loginBody.user, storageKey: 'lingua-pro-zustand' },
  );

  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');

  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});
