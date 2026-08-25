import { test, expect, APIRequestContext } from '@playwright/test';

// All tests in this file verify routing behaviour for unauthenticated visitors.
test.use({ storageState: { cookies: [], origins: [] } });

// register is invite-only — bootstrap a throwaway user by calling auth-service
// directly with internal-service credentials, bypassing the API Gateway
// (which does not forward x-internal-token/x-internal-service to subgraphs).
async function registerTestUser(request: APIRequestContext) {
  const email = `e2e.${Date.now()}.${Math.random().toString(36).slice(2)}@lingua.test`;
  const password = 'Test1234!';

  const registerResp = await request.post('http://localhost:4001/graphql', {
    data: {
      query: `mutation {
        register(email: "${email}", password: "${password}") {
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
    data?: { register?: { token?: string; user?: { id: string; email: string } } };
    errors?: { message: string }[];
  };

  if (!body?.data?.register?.token || !body?.data?.register?.user) {
    throw new Error(`Registration failed: ${JSON.stringify(body)}`);
  }

  return { email, password };
}

// Protected routes — AppShell redirects to /login when no token is present.
for (const route of ['/writing', '/reading', '/speaking', '/listening', '/settings']) {
  test(`unauthenticated visit to ${route} redirects to /login`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL('/login', { timeout: 10_000 });
  });
}

test('/dashboard is accessible without authentication', async ({ page }) => {
  await page.goto('/dashboard');
  // AppShell treats /dashboard as public
  await expect(page.getByText('LanguageLab')).toBeVisible();
  await expect(page).toHaveURL('/dashboard');
});

test('/login page renders correctly without authentication', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByPlaceholder('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
});

test('dashboard skill cards navigate to correct routes when authenticated', async ({ page, request }) => {
  const { email, password } = await registerTestUser(request);

  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/dashboard');

  // "Writing" also matches the top-nav icon link — the skill-card grid link
  // renders after it in the DOM, so .last() targets the card.
  await page.getByRole('link', { name: 'Writing' }).last().click();
  await expect(page).toHaveURL('/writing');
  await expect(page.getByRole('heading', { name: 'Writing' })).toBeVisible();
});
