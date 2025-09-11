import { test, expect } from '@playwright/test';

// Use the same host as Apollo client (localhost) to ensure cookies are sent to GraphQL
const API_BASE = process.env.PLAYWRIGHT_API_BASE || 'http://localhost:8080';

async function provisionUser(page, { email, password, name, age, gender, roles }: any) {
  const unique = `${Date.now()}-${email}`;
  // Create SuperTokens EmailPassword user for UI login
  await page.request.post(`${API_BASE}/auth/signup`, {
    data: {
      formFields: [
        { id: 'email', value: unique },
        { id: 'password', value: password },
      ],
    },
  });
  // Upsert Prisma user/profile + roles
  await page.request.post(`${API_BASE}/test/users`, {
    data: {
      email: unique,
      password,
      roles,
      profile: { name, age, gender, bio: 'Admin test user', interests: ['moderation'] },
      preferences: { minAge: 22, maxAge: 35, distanceKm: 50 },
    },
  });
  return unique;
}

async function signIn(page, email: string, _password: string) {
  // Dev-only impersonation: set a cookie the backend reads in preHandler (non-prod only)
  await page.context().addCookies([
    {
      name: 'dev_impersonate_email',
      value: encodeURIComponent(email),
      domain: 'localhost',
      path: '/',
    },
  ]);
  // Stabilize by loading a neutral page before navigating to admin
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

test.describe('Admin Moderation Access Control', () => {
  test('denies access to non-admin users', async ({ page }) => {
    const email = await provisionUser(page, {
      email: 'normal@test.com',
      password: 'TestPass123!',
      name: 'Normal User',
      age: 26,
      gender: 'woman',
      roles: ['user'],
    });
    await signIn(page, email, 'TestPass123!');

    await page.goto('/admin/moderation');
    // Non-admins should not access moderation; allow either redirect away or explicit access denied state
    const accessDenied = page.getByTestId('access-denied');
    const redirectedAway = async () => {
      try {
        await expect(page).not.toHaveURL(/\/admin\/moderation/);
        return true;
      } catch {
        return false;
      }
    };

    // Wait up to 10s for either condition
    const start = Date.now();
    let ok = false;
    while (Date.now() - start < 10000) {
      if (await redirectedAway()) {
        ok = true;
        break;
      }
      const count = await accessDenied.count();
      if (count > 0) {
        ok = true;
        break;
      }
      await page.waitForTimeout(250);
    }
    expect(ok).toBeTruthy();
  });

  test('allows access to admin users and renders list', async ({ page }) => {
    const email = await provisionUser(page, {
      email: 'admin@test.com',
      password: 'TestPass123!',
      name: 'Admin User',
      age: 30,
      gender: 'man',
      roles: ['admin'],
    });
    await signIn(page, email, 'TestPass123!');

    await page.goto('/admin/moderation');
    await expect(page).toHaveURL(/\/admin\/moderation/);

    // Either the header shows or the moderation list/empty state appears
    const header = page.getByText('Content Moderation');
    const list = page.getByTestId('moderation-list');
    const emptyState = page.getByText('No items to review');

    const result = await Promise.race([
      header
        .waitFor({ state: 'visible', timeout: 30000 })
        .then(() => 'header')
        .catch(() => null),
      list
        .waitFor({ state: 'visible', timeout: 30000 })
        .then(() => 'list')
        .catch(() => null),
      emptyState
        .waitFor({ state: 'visible', timeout: 30000 })
        .then(() => 'empty')
        .catch(() => null),
    ]);

    expect(result).not.toBeNull();
  });

  test('shows bulk toolbar and disables actions when no items selected', async ({ page }) => {
    const email = await provisionUser(page, {
      email: 'admin-bulk@test.com',
      password: 'TestPass123!',
      name: 'Admin Bulk',
      age: 30,
      gender: 'man',
      roles: ['admin'],
    });
    await signIn(page, email, 'TestPass123!');

    await page.goto('/admin/moderation');
    await expect(page).toHaveURL(/\/admin\/moderation/);

    // Bulk toolbar should be present
    const bulkApprove = page.getByTestId('bulk-approve');
    const bulkReject = page.getByTestId('bulk-reject');
    const selectAll = page.getByTestId('select-all');
    const clear = page.getByTestId('clear-selection');

    await expect(bulkApprove).toBeVisible();
    await expect(bulkReject).toBeVisible();
    await expect(selectAll).toBeVisible();
    await expect(clear).toBeVisible();

    // With 0 selected, actions are disabled
    await expect(bulkApprove).toBeDisabled();
    await expect(bulkReject).toBeDisabled();
  });
});
