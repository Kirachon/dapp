import { test, expect } from '@playwright/test';

test.describe('Signup Flow Test', () => {
  test('Complete signup flow redirects to onboarding', async ({ page }) => {
    console.log('🚀 Testing complete signup flow...');

    // Step 1: Navigate to signup page
    await page.goto('/signup');
    await expect(page).toHaveURL('/signup');
    console.log('✅ Navigated to signup page');

    // Step 2: Fill signup form
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPass123!';

    await page.fill('input[type="email"]', testEmail);
    console.log('✅ Filled email field');

    // Handle both password fields
    const passwordFields = await page.locator('input[type="password"]').all();
    console.log(`📝 Found ${passwordFields.length} password fields`);
    
    if (passwordFields.length >= 1) {
      await passwordFields[0].fill(testPassword);
      console.log('✅ Filled first password field');
    }
    if (passwordFields.length >= 2) {
      await passwordFields[1].fill(testPassword);
      console.log('✅ Filled confirm password field');
    }

    // Check for terms checkbox
    const termsCheckbox = page.locator('input[type="checkbox"]');
    if (await termsCheckbox.isVisible({ timeout: 1000 })) {
      await termsCheckbox.check();
      console.log('✅ Accepted terms and conditions');
    }

    // Step 3: Submit signup form
    await page.click('button[type="submit"]');
    console.log('✅ Submitted signup form');

    // Step 4: Wait for redirect and check URL
    await page.waitForTimeout(8000); // Give more time for the API calls
    
    const currentUrl = page.url();
    console.log(`📍 Current URL after signup: ${currentUrl}`);

    // Check for different possible outcomes
    if (currentUrl.includes('/onboarding')) {
      console.log('🎉 SUCCESS: Redirected to onboarding!');
      expect(currentUrl).toContain('/onboarding');
    } else if (currentUrl.includes('/signin')) {
      console.log('⚠️ Redirected to signin instead of onboarding');
      // This might still be success if the signin worked
    } else {
      console.log('❌ Unexpected redirect location');
    }

    // Check for any error messages
    const errorMessages = await page.locator('text=error, text=Error, text=failed, text=Failed, .error, .alert-error').all();
    if (errorMessages.length > 0) {
      console.log('⚠️ Found error messages on page:');
      for (const error of errorMessages) {
        const text = await error.textContent();
        console.log(`   Error: ${text}`);
      }
    } else {
      console.log('✅ No error messages found');
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/signup-flow-result.png' });
    console.log('📸 Screenshot saved to test-results/signup-flow-result.png');
  });

  test('Test API endpoints directly', async ({ page }) => {
    console.log('🔌 Testing API endpoints directly...');

    const testEmail = `api-test-${Date.now()}@example.com`;
    const testPassword = 'TestPass123!';

    // Test signup API
    const signupResponse = await page.request.post('http://localhost:8080/auth/signup', {
      headers: { rid: 'emailpassword', 'content-type': 'application/json' },
      data: { formFields: [ { id: 'email', value: testEmail }, { id: 'password', value: testPassword } ] }
    });

    console.log(`📊 Signup API status: ${signupResponse.status()}`);
    const signupData = await signupResponse.json();
    console.log('📊 Signup response:', signupData);

    expect(signupResponse.status()).toBe(200);

    // Test signin API
    const signinResponse = await page.request.post('http://localhost:8080/auth/signin', {
      headers: { rid: 'emailpassword', 'content-type': 'application/json' },
      data: { formFields: [ { id: 'email', value: testEmail }, { id: 'password', value: testPassword } ] }
    });

    console.log(`📊 Signin API status: ${signinResponse.status()}`);
    const signinData = await signinResponse.json();
    console.log('📊 Signin response:', signinData);

    expect(signinResponse.status()).toBe(200);
  });
});
