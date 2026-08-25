import { test, expect, APIRequestContext } from '@playwright/test';

// All auth tests start unauthenticated — override the project-level storageState.
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

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
}

test('valid login redirects to dashboard', async ({ page, request }) => {
  const { email, password } = await registerTestUser(request);

  await login(page, email, password);

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText('LanguageLab')).toBeVisible();
});

test('invalid credentials stay on login page with error', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill('nobody@example.com');
  await page.getByPlaceholder('Password').fill('WrongPass123');
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for the login mutation to complete (button leaves pending state)
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL('/login');
  // Status message should no longer be the default greeting
  await expect(
    page.getByText('Please login to access learning tasks.'),
  ).not.toBeVisible();
});

test('authenticated user visiting /login is redirected to dashboard', async ({ page, request }) => {
  const { email, password } = await registerTestUser(request);

  await login(page, email, password);
  await page.waitForURL('**/dashboard');

  // Revisiting /login should bounce back to /dashboard
  await page.goto('/login');
  await expect(page).toHaveURL('/dashboard');
});

test('logout returns user to login page', async ({ page, request }) => {
  const { email, password } = await registerTestUser(request);

  await login(page, email, password);
  await page.waitForURL('**/dashboard');

  await page.getByRole('button', { name: 'Log Out' }).click();
  await expect(page).toHaveURL('/login');
});
