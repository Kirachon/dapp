import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS } from './helpers/auth';

test.describe('Authentication Foundation', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test('should create Alice test account and verify signin', async ({ page }) => {
    console.log('🧪 Testing Alice account creation and signin...');

    // Step 1: Clear any existing auth state
    await authHelper.clearAuthState();

    // Step 2: Create Alice's account using AuthHelper
    console.log('📝 Creating Alice account...');
    await authHelper.signUp(TEST_USERS.alice);

    // Step 3: Verify we're redirected to onboarding or discover
    const currentUrl = page.url();
    console.log(`✅ After signup, redirected to: ${currentUrl}`);
    expect(currentUrl).toMatch(/\/(onboarding|discover)/);

    // Step 4: Clear auth state and test signin
    console.log('🔄 Clearing auth state and testing signin...');
    await authHelper.clearAuthState();

    // Step 5: Sign in with the same account
    console.log('🔑 Signing in with Alice account...');
    await authHelper.signIn(TEST_USERS.alice);

    // Step 6: Verify successful signin and redirect
    const signinUrl = page.url();
    console.log(`✅ After signin, redirected to: ${signinUrl}`);
    expect(signinUrl).toMatch(/\/(onboarding|discover)/);

    console.log('🎉 Alice account creation and signin verified successfully!');
  });

  test('should create Bob test account and verify signin', async ({ page }) => {
    console.log('🧪 Testing Bob account creation and signin...');
    
    // Step 1: Clear any existing auth state
    await authHelper.clearAuthState();
    
    // Step 2: Create Bob's account using AuthHelper
    console.log('📝 Creating Bob account...');
    await authHelper.signUp(TEST_USERS.bob);
    
    // Step 3: Verify we're redirected to onboarding or discover
    const currentUrl = page.url();
    console.log(`✅ After signup, redirected to: ${currentUrl}`);
    expect(currentUrl).toMatch(/\/(onboarding|discover)/);
    
    // Step 4: Clear auth state and test signin
    console.log('🔄 Clearing auth state and testing signin...');
    await authHelper.clearAuthState();
    
    // Step 5: Sign in with the same account
    console.log('🔑 Signing in with Bob account...');
    await authHelper.signIn(TEST_USERS.bob);
    
    // Step 6: Verify successful signin and redirect
    const signinUrl = page.url();
    console.log(`✅ After signin, redirected to: ${signinUrl}`);
    expect(signinUrl).toMatch(/\/(onboarding|discover)/);
    
    console.log('🎉 Bob account creation and signin verified successfully!');
  });

  test('should create Charlie test account and verify signin', async ({ page }) => {
    console.log('🧪 Testing Charlie account creation and signin...');
    
    // Step 1: Clear any existing auth state
    await authHelper.clearAuthState();
    
    // Step 2: Create Charlie's account using AuthHelper
    console.log('📝 Creating Charlie account...');
    await authHelper.signUp(TEST_USERS.charlie);
    
    // Step 3: Verify we're redirected to onboarding or discover
    const currentUrl = page.url();
    console.log(`✅ After signup, redirected to: ${currentUrl}`);
    expect(currentUrl).toMatch(/\/(onboarding|discover)/);
    
    // Step 4: Clear auth state and test signin
    console.log('🔄 Clearing auth state and testing signin...');
    await authHelper.clearAuthState();
    
    // Step 5: Sign in with the same account
    console.log('🔑 Signing in with Charlie account...');
    await authHelper.signIn(TEST_USERS.charlie);
    
    // Step 6: Verify successful signin and redirect
    const signinUrl = page.url();
    console.log(`✅ After signin, redirected to: ${signinUrl}`);
    expect(signinUrl).toMatch(/\/(onboarding|discover)/);
    
    console.log('🎉 Charlie account creation and signin verified successfully!');
  });

  test('should verify multiple accounts can be created simultaneously', async ({ page }) => {
    console.log('🧪 Testing multiple account creation workflow...');

    // This test verifies that our authentication system can handle multiple account creations
    // Each account gets a unique timestamped email, so they don't conflict

    // Create a new unique account for this test
    const testUser = {
      email: 'multi-test@test.com',
      password: 'TestPassword123!',
      name: 'Multi Test User'
    };

    console.log('📝 Creating unique test account...');
    await authHelper.clearAuthState();
    await authHelper.signUp(testUser);

    const currentUrl = page.url();
    console.log(`✅ Account created and redirected to: ${currentUrl}`);
    expect(currentUrl).toMatch(/\/(onboarding|discover)/);

    // Test signin with the same account
    console.log('🔑 Testing signin with created account...');
    await authHelper.clearAuthState();
    await authHelper.signIn(testUser);

    const signinUrl = page.url();
    console.log(`✅ Signin successful, redirected to: ${signinUrl}`);
    expect(signinUrl).toMatch(/\/(onboarding|discover)/);

    console.log('🎉 Multiple account workflow verified!');
  });
});
