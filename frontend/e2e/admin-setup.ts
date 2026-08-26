import { test as setup } from '@playwright/test';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { TEST_EMAIL, TEST_PASSWORD } from './admin-test-user';

const ADMIN_AUTH_FILE = path.join(__dirname, '../playwright/.auth/admin.json');
const REPO_ROOT = path.join(__dirname, '../..');

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

  const loginResp = await request.post('http://localhost:4001/graphql', {
    data: {
      query: `mutation {
        login(email: "${TEST_EMAIL}", password: "${TEST_PASSWORD}") {
          token
          user { id email role language }
        }
      }`,
    },
  });

  const loginBody = (await loginResp.json()) as {
    data?: { login?: { token?: string; user?: { id: string; email: string; role: string; language: string } } };
    errors?: { message: string }[];
  };

  if (!loginBody?.data?.login?.token || loginBody.data.login.user?.role !== 'admin') {
    throw new Error(`Admin promotion failed: ${JSON.stringify(loginBody)}`);
  }

  const { token, user: adminUser } = loginBody.data.login;

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
            level: 'B2',
            theme: 'system',
            lastTaskTitle: null,
          },
          version: 0,
        }),
      );
    },
    { authToken: token, authUser: adminUser, storageKey: 'lingua-pro-zustand' },
  );

  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');

  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});
