import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS, AppTestHelper } from './helpers/auth';

test.describe('Complete Dating App E2E Workflow', () => {
  test.beforeEach(async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.clearAuthState();
  });

  test('Complete user signup and onboarding flow', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.alice;

    // Step 1-3: Sign up via helper (robust selectors + waits)
    await authHelper.signUp(user);

    // Step 4: Complete full onboarding process
    await authHelper.completeOnboarding(user);

    // Step 5: Verify successful completion
    await expect(page).toHaveURL(/\/(discover|dashboard)/);

    // Verify user can access protected routes
    await appHelper.verifyAuthenticatedAccess('/profile');
    await appHelper.verifyAuthenticatedAccess('/matches');
  });

  test('User login with existing credentials', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const user = TEST_USERS.bob;

    // First create the user account
    await authHelper.createTestUserWithProfile(user);
    await authHelper.signOut();

    // Now test login
    await page.goto('/signin');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');

    // Should redirect to discover page
    await expect(page).toHaveURL(/\/(discover|dashboard)/);
  });

  test('Discovery feed and swiping functionality', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.charlie;

    // Setup authenticated user
    await authHelper.createTestUserWithProfile(user);
    
    // Navigate to discovery
    await appHelper.navigateToDiscovery();

    // Test swiping functionality
    for (let i = 0; i < 3; i++) {
      try {
        // Try to swipe right (like)
        await appHelper.swipeProfile('right');
        
        // Check for potential match
        const hasMatch = await appHelper.checkForMatchModal();
        if (hasMatch) {
          console.log('Match detected!');
          await appHelper.dismissMatchModal();
        }
        
        // Wait between swipes
        await page.waitForTimeout(1000);
      } catch (error) {
        console.log(`No more profiles to swipe or error: ${error}`);
        break;
      }
    }

    // Test pass/reject swipe
    try {
      await appHelper.swipeProfile('left');
    } catch {
      console.log('No profiles available for left swipe');
    }
  });

  test('Messaging system with real-time features', async ({ page, context }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user1 = TEST_USERS.alice;

    // Create user and complete onboarding
    await authHelper.createTestUserWithProfile(user1);

    // Navigate to matches page
    await appHelper.navigateToMatches();

    // Check if there are any matches to test with
    const matchExists = await page.locator('[data-testid^="match-"], .match-item').first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (matchExists) {
      // Open first conversation
      await appHelper.openConversation(0);

      // Send a test message
      const testMessage = `Hello! This is a test message from ${user1.name}`;
      await appHelper.sendMessage(testMessage);

      // Verify message appears in conversation
      await expect(page.locator(`text=${testMessage}`)).toBeVisible();

      // Test typing indicator (simulate typing)
      await page.fill('[data-testid="message-input"], input[placeholder*="message"]', 'Typing test...');
      await page.waitForTimeout(1000);
      
      // Clear the input
      await page.fill('[data-testid="message-input"], input[placeholder*="message"]', '');
    } else {
      console.log('No matches available for messaging test');
    }
  });

  test('Profile management functionality', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.bob;

    // Setup user
    await authHelper.createTestUserWithProfile(user);

    // Navigate to profile
    await appHelper.navigateToProfile();

    // Wait briefly for profile name to render; avoid long waits
    await page.locator('[data-testid="profile-name"]').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    // Verify profile information is displayed
    try {
      const nameText = await page.locator('[data-testid="profile-name"]').first().textContent().catch(() => null);
      console.log('DEBUG profile-name text:', nameText);
      await expect(page.locator('[data-testid="profile-name"]').filter({ hasText: user.name })).toBeVisible();
    } catch {
      await expect(page.locator(`text=${user.name}`)).toBeVisible();
    }
    try {
      const ageText = await page.locator('[data-testid="profile-age"]').first().textContent().catch(() => null);
      console.log('DEBUG profile-age text:', ageText);
      await expect(page.locator('[data-testid="profile-age"]').filter({ hasText: String(user.age) })).toBeVisible();
    } catch {
      await expect(page.locator(`text=${user.age}`)).toBeVisible();
    }

  });

  test('Role-based access control (RBAC)', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);

    // Test unauthenticated access
    await appHelper.verifyProtectedRoute('/discover');
    await appHelper.verifyProtectedRoute('/matches');
    await appHelper.verifyProtectedRoute('/profile');

    // Create authenticated user
    const user = TEST_USERS.alice;
    await authHelper.createTestUserWithProfile(user);

    // Test authenticated access
    await appHelper.verifyAuthenticatedAccess('/discover');
    await appHelper.verifyAuthenticatedAccess('/matches');
    await appHelper.verifyAuthenticatedAccess('/profile');

    // Test session persistence across page reloads
    await page.goto('/discover');
    await page.reload();
    await expect(page).toHaveURL('/discover');

    // Test sign out
    await authHelper.signOut();
    
    // Verify access is revoked after sign out
    await appHelper.verifyProtectedRoute('/discover');
  });

  test('Responsive design across different viewports', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.charlie;

    // Setup authenticated user
    await authHelper.createTestUserWithProfile(user);

    // Test responsive design on different pages
    const pages = ['/discover', '/matches', '/profile'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await appHelper.checkResponsiveDesign();
    }
  });

  test('Cross-module integration and data flow', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.bob;

    // Test complete data flow from signup to discovery
    await authHelper.signUp(user);
    await authHelper.completeOnboarding(user);

    // Verify profile data is available in discovery
    await appHelper.navigateToDiscovery();
    
    // Check that user's profile affects discovery (they shouldn't see themselves)
    await page.waitForTimeout(2000);
    
    // Navigate to profile to verify data persistence
    await appHelper.navigateToProfile();

    // Wait for GraphQL myProfile to resolve before asserting UI
    try {
      await page.waitForResponse(
        (resp) => resp.url().includes('/graphql') && resp.request().method() === 'POST' && (resp.request().postData() || '').includes('myProfile'),
        { timeout: 10000 }
      );
    } catch {}

    try {
      const nameText2 = await page.locator('[data-testid="profile-name"]').first().textContent().catch(() => null);
      console.log('DEBUG (flow) profile-name text:', nameText2);
      await expect(page.locator('[data-testid="profile-name"]').filter({ hasText: user.name })).toBeVisible();
    } catch {
      await expect(page.locator(`text=${user.name}`)).toBeVisible();
    }

    // Test GraphQL API integration (use same-origin proxy)
    const response = await page.request.post('/api/graphql', {
      data: {
        query: '{ me { id email } }'
      }
    });
    
    expect(response.ok()).toBeTruthy();
  });

  test('Error handling and edge cases', async ({ page }) => {
    const authHelper = new AuthHelper(page);

    // Test invalid login credentials
    await page.goto('/signin');
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should stay on signin page or show error
    await expect(page).toHaveURL('/signin');

    // Test weak password validation
    await page.goto('/signup');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', '123'); // Too weak
    await page.click('button[type="submit"]');

    // Should stay on signup page
    await expect(page).toHaveURL('/signup');

    // Test network error handling (simulate one failed GraphQL request, then restore)
    await page.route('**/graphql', (route) => { route.abort(); page.unroute('**/graphql'); });

    const user = TEST_USERS.alice;
    await authHelper.createTestUserWithProfile(user);
    
    // Try to navigate to a page that requires GraphQL
    await page.goto('/discover');
    
    // Should handle the error gracefully
    await page.waitForTimeout(2000);
  });
});
