import { test, expect } from '@playwright/test';

const API_BASE = process.env.PLAYWRIGHT_API_BASE || 'http://localhost:8080';

// Smoke test that GraphQL `me` works with dev impersonation cookie in non-production
// This safeguards the cookie-based session path used by the app.
test('GraphQL me returns user when dev impersonation cookie is set', async ({ page }) => {
  const email = `smoke-${Date.now()}@test.com`;

  // Upsert a user + profile in backend for testing
  await page.request.post(`${API_BASE}/test/users`, {
    data: {
      email,
      password: 'TestPass123!',
      roles: ['admin'],
      profile: { name: 'Smoke Tester', age: 28, gender: 'man' },
    },
  });

  // Set dev impersonation cookie for GraphQL calls (read by backend preHandler)
  await page
    .context()
    .addCookies([
      {
        name: 'dev_impersonate_email',
        value: encodeURIComponent(email),
        domain: 'localhost',
        path: '/',
      },
    ]);

  // Call GraphQL me via browser fetch so cookies are sent (credentials: include)
  const result = await page.evaluate(async () => {
    const res = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'query { me { id email profile { isAdmin } } }' }),
    });
    return res.json();
  });

  expect(result?.data?.me?.email).toBeDefined();
  expect(result?.data?.me?.profile?.isAdmin).toBe(true);
});
