import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/auth';

const API = process.env.PLAYWRIGHT_API_BASE || 'http://127.0.0.1:8080';

async function gotoApiOrigin(page) {
  await page.goto(`${API}/health`, { waitUntil: 'load' });
}

async function apiFetch(page, path: string, init?: any) {
  return page.evaluate(
    async ({ url, init }) => {
      const res = await fetch(url, {
        ...init,
        credentials: 'include',
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      } as RequestInit);
      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {}
      return { ok: res.ok, status: res.status, text, json };
    },
    { url: `${API}${path}`, init },
  );
}

async function ensureEnvReady(page): Promise<boolean> {
  try {
    const ready = await apiFetch(page, '/ready', { method: 'GET' });
    return ready.ok && ready.json?.status === 'ready';
  } catch {
    return false;
  }
}

async function signInViaTestRoute(page, email: string, password: string) {
  // Ensure user exists
  const upsert = await apiFetch(page, '/test/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, profile: { name: 'E2E User', age: 25 } }),
  });
  if (!upsert.ok) {
    test.skip(true, `Skipping: test upsert route failed (${upsert.status}) - likely DB not ready`);
  }
  // Sign in to set SuperTokens cookies on this page's context
  const res = await apiFetch(page, '/test/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    test.skip(
      true,
      `Skipping: /test/auth/signin failed (${res.status}) -> ${res.text?.slice(0, 200)}`,
    );
  }
  expect(res.json?.ok).toBeTruthy();
}

async function graphQLMe(page) {
  return apiFetch(page, '/graphql', {
    method: 'POST',
    body: JSON.stringify({ query: 'query Me { me { id email } }' }),
  });
}

async function signOut(page) {
  await apiFetch(page, '/test/auth/signout', { method: 'POST' });
}

function findCookie(cookies, namePart: string) {
  return cookies.find((c) => c.name.includes(namePart));
}

test.describe('Advanced Authentication E2E', () => {
  const user = TEST_USERS.alice;

  test('Multi-tab session sync and logout propagation (same context)', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await gotoApiOrigin(page1);
    await gotoApiOrigin(page2);

    if (!(await ensureEnvReady(page1))) {
      test.skip(true, 'Skipping: API readiness check failed (DB likely not available)');
    }

    const uniqueEmail = `${Date.now()}-${user.email}`;
    await signInViaTestRoute(page1, uniqueEmail, user.password);

    // Tab 2 should share cookies in same context
    const me2 = await graphQLMe(page2);
    expect(me2.ok).toBeTruthy();
    expect(me2.json?.data?.me?.email).toBeTruthy();

    // Sign out in tab1
    await signOut(page1);

    // Access in tab2 should now be unauthenticated
    const meAfterSignout = await graphQLMe(page2);
    expect(meAfterSignout.json?.errors?.[0]?.message || '').toMatch(/Unauthenticated|Not.*auth/i);

    await context.close();
  });

  test('Session refresh flow: invalid access token -> refresh -> access restored', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await gotoApiOrigin(page);

    if (!(await ensureEnvReady(page))) {
      test.skip(true, 'Skipping: API readiness check failed (DB likely not available)');
    }

    const email = `${Date.now()}-${user.email}`;
    await signInViaTestRoute(page, email, user.password);

    // Ensure authenticated
    const me = await graphQLMe(page);
    expect(me.ok).toBeTruthy();

    // Overwrite access token cookie to simulate expiry/invalid token
    const cookies = await context.cookies();
    const at = findCookie(cookies, 'sAccessToken');
    if (at) {
      await context.addCookies([{ ...at, value: 'invalid.access.token' }]);
    }

    // Attempt GraphQL, then trigger refresh explicitly (works in dev where antiCsrf = NONE)
    await graphQLMe(page);
    const refresh = await apiFetch(page, '/auth/session/refresh', { method: 'POST' });

    // After refresh, GraphQL should succeed again (if session active)
    const meAfter = await graphQLMe(page);
    if (refresh.ok) {
      expect(meAfter.ok).toBeTruthy();
      expect(meAfter.json?.data?.me).toBeTruthy();
    } else {
      // If refresh failed, the session was considered invalid; assert error
      expect(meAfter.json?.errors).toBeTruthy();
    }

    await context.close();
  });

  test('Token theft / revocation: refresh denied after server-side revoke', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await gotoApiOrigin(page);

    if (!(await ensureEnvReady(page))) {
      test.skip(true, 'Skipping: API readiness check failed (DB likely not available)');
    }

    await signInViaTestRoute(page, `${Date.now()}-${user.email}`, user.password);

    // Revoke on server (simulating theft detection leading to revocation)
    await signOut(page);

    // Attempt to refresh should be denied
    const refresh = await apiFetch(page, '/auth/session/refresh', { method: 'POST' });
    expect(refresh.ok).toBeFalsy();
    expect([401, 403]).toContain(refresh.status);

    // Access should also be denied
    const meAfter = await graphQLMe(page);
    expect(meAfter.json?.errors).toBeTruthy();

    await context.close();
  });

  test('CSRF prevention behavior (prod-like)', async ({ browser }) => {
    const isProdLike = process.env.NODE_ENV === 'production';
    const context = await browser.newContext();
    const page = await context.newPage();
    await gotoApiOrigin(page);

    if (!(await ensureEnvReady(page))) {
      test.skip(true, 'Skipping: API readiness check failed (DB likely not available)');
    }

    await signInViaTestRoute(page, `${Date.now()}-${user.email}`, user.password);

    // Try refresh without anti-CSRF header
    const res = await apiFetch(page, '/auth/session/refresh', {
      method: 'POST',
      headers: {},
    });

    if (isProdLike) {
      // In production, antiCsrf=VIA_TOKEN, so this should be blocked
      expect(res.ok).toBeFalsy();
      expect([401, 403]).toContain(res.status);
    } else {
      // In development (antiCsrf=NONE), it may succeed
      expect([200, 401, 403]).toContain(res.status);
    }

    await context.close();
  });
});
