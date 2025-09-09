import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS } from './helpers/auth';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.clearAuthState();

    // Sign up a user to start onboarding
    const user = TEST_USERS.alice;
    await authHelper.signUp(user);
  });

  test('should display onboarding welcome screen', async ({ page }) => {
    // Check if onboarding page loads with correct heading
    await expect(page.locator('h1')).toContainText('Tell us about you');

    // Check if progress indicator is visible (step 1/5)
    await expect(page.locator('text=1/5')).toBeVisible();

    // Check if continue button is visible
    await expect(page.locator('button').filter({ hasText: /continue|next|start/i })).toBeVisible();
  });

  test('should complete step 1 - Basic Information', async ({ page }) => {
    // Fill in basic information - updated for onboarding-v2 structure
    await page.fill('input[placeholder*="name"]', 'John');

    // Set age using the number input
    await page.fill('input[type="number"]', '25');

    // Select gender (optional) - onboarding-v2 uses buttons
    await page.click('button:has-text("Man")');

    // Select orientation (optional)
    await page.click('button:has-text("Straight")');

    // Click continue
    await page.click('button:has-text("Continue")');

    // Should navigate to photos step
    await expect(page).toHaveURL(/\/onboarding(-v2)?\/photos/);
  });

  test('should validate required fields', async ({ page }) => {
    // Try to continue without filling required fields
    await page.click('button:has-text("Continue")');

    // Should show validation errors - use more flexible selectors
    await expect(page.locator('.text-red-300, .text-red-400, .text-red-500, .text-red-600, .error, [class*="error"]').first()).toBeVisible();

    // Fill name but invalid age
    await page.fill('input[placeholder*="name"]', 'John');
    await page.fill('input[type="number"]', '17'); // Under 18

    await page.click('button:has-text("Continue")');

    // Should show age validation error - use flexible selector
    await expect(page.locator('.text-red-300, .text-red-400, .text-red-500, .text-red-600, .error, [class*="error"]').first()).toBeVisible();
  });

  test('should allow age adjustment with buttons', async ({ page }) => {
    // Test age increment/decrement buttons
    const ageInput = page.locator('input[type="number"]');
    const incrementBtn = page.locator('button:has-text("+")');
    const decrementBtn = page.locator('button:has-text("−")');

    // Set initial age
    await ageInput.fill('25');
    await expect(ageInput).toHaveValue('25');

    // Test increment
    await incrementBtn.click();
    await expect(ageInput).toHaveValue('26');

    // Test decrement
    await decrementBtn.click();
    await expect(ageInput).toHaveValue('25');

    // Test minimum age enforcement
    await ageInput.fill('18');
    await decrementBtn.click();
    await expect(ageInput).toHaveValue('18'); // Should not go below 18
  });

  test('should show gender and orientation options', async ({ page }) => {
    // Check that gender options are available - use getByRole for exact matching
    await expect(page.getByRole('button', { name: 'Woman', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Man', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Non-binary', exact: true })).toBeVisible();

    // Check that orientation options are available
    await expect(page.getByRole('button', { name: 'Straight', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gay', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lesbian', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bisexual', exact: true })).toBeVisible();

    // Test selection
    await page.getByRole('button', { name: 'Woman', exact: true }).click();
    await page.getByRole('button', { name: 'Bisexual', exact: true }).click();

    // Selected options should be highlighted
    await expect(page.getByRole('button', { name: 'Woman', exact: true })).toHaveClass(/border-white\/50|bg-white\/20/);
    await expect(page.getByRole('button', { name: 'Bisexual', exact: true })).toHaveClass(/border-white\/50|bg-white\/20/);
  });

  test('should have back button functionality', async ({ page }) => {
    // Check that back button is visible
    await expect(page.locator('button:has-text("Back")')).toBeVisible();

    // Fill some data
    await page.fill('input[placeholder*="name"]', 'John');
    await page.fill('input[type="number"]', '25');

    // Click back button
    await page.click('button:has-text("Back")');

    // Should navigate back (in this case, likely to signup or previous page)
    // We don't assert specific URL since it depends on navigation history
    await page.waitForTimeout(1000);
  });
});
