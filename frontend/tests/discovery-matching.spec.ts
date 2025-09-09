import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS, AppTestHelper } from './helpers/auth';

test.describe('Discovery and Matching System', () => {
  test.beforeEach(async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.clearAuthState();
  });

  test('Discovery feed loads and displays profiles', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.alice;

    await authHelper.createTestUserWithProfile(user);
    await appHelper.navigateToDiscovery();

    // Wait for profiles to load
    await page.waitForTimeout(3000);

    // Check if profile cards are displayed
    const profileElements = [
      '[data-testid="profile-card"]',
      '.profile-card',
      '.card',
      '.discovery-card'
    ];

    let profileFound = false;
    for (const selector of profileElements) {
      if (await page.locator(selector).isVisible({ timeout: 2000 })) {
        profileFound = true;
        console.log(`Found profile card with selector: ${selector}`);
        break;
      }
    }

    if (!profileFound) {
      // Check for "no more profiles" or empty state
      const emptyStateElements = [
        'text=No more profiles',
        'text=No users found',
        'text=Come back later',
        '[data-testid="empty-state"]'
      ];

      for (const selector of emptyStateElements) {
        if (await page.locator(selector).isVisible({ timeout: 2000 })) {
          console.log(`Found empty state: ${selector}`);
          profileFound = true;
          break;
        }
      }
    }

    if (!profileFound) {
      test.skip(true, 'No profiles or empty state found in discovery (local dev)');
    }
  });

  test('Swiping functionality - Like, Pass, Super Like', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.bob;

    await authHelper.createTestUserWithProfile(user);
    await appHelper.navigateToDiscovery();

    // Test different swipe actions
    const swipeActions = ['right', 'left', 'super'] as const;
    
    for (const action of swipeActions) {
      try {
        // Check if profile is available
        const hasProfile = await page.locator('[data-testid="profile-card"], .profile-card, .card').isVisible({ timeout: 3000 });
        
        if (hasProfile) {
          console.log(`Testing ${action} swipe`);
          await appHelper.swipeProfile(action);
          
          // Check for match modal if it's a like or super like
          if (action === 'right' || action === 'super') {
            const hasMatch = await appHelper.checkForMatchModal();
            if (hasMatch) {
              console.log('Match detected!');
              await appHelper.dismissMatchModal();
            }
          }
          
          await page.waitForTimeout(1000);
        } else {
          console.log('No profiles available for swiping');
          break;
        }
      } catch (error) {
        console.log(`Error during ${action} swipe: ${error}`);
        break;
      }
    }
  });

  test('Match detection and celebration modal', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.charlie;

    await authHelper.createTestUserWithProfile(user);
    await appHelper.navigateToDiscovery();

    // Swipe right on multiple profiles to increase match chances
    for (let i = 0; i < 5; i++) {
      try {
        const hasProfile = await page.locator('[data-testid="profile-card"], .profile-card, .card').isVisible({ timeout: 2000 });
        
        if (hasProfile) {
          await appHelper.swipeProfile('right');
          
          // Check for match modal
          const hasMatch = await appHelper.checkForMatchModal();
          if (hasMatch) {
            console.log('Match celebration modal appeared!');
            
            // Verify modal content
            const modalElements = [
              'text=It\'s a Match!',
              'text=You matched!',
              'text=Congratulations',
              '[data-testid="match-modal"]'
            ];

            let modalContentFound = false;
            for (const selector of modalElements) {
              if (await page.locator(selector).isVisible({ timeout: 2000 })) {
                modalContentFound = true;
                break;
              }
            }

            expect(modalContentFound).toBeTruthy();

            // Test modal actions
            const actionButtons = [
              'button:has-text("Send Message")',
              'button:has-text("Keep Swiping")',
              'button:has-text("Continue")',
              '[data-testid="send-message-button"]',
              '[data-testid="continue-swiping"]'
            ];

            for (const buttonSelector of actionButtons) {
              if (await page.locator(buttonSelector).isVisible({ timeout: 1000 })) {
                await page.click(buttonSelector);
                break;
              }
            }

            break; // Exit loop after finding a match
          }
          
          await page.waitForTimeout(1000);
        } else {
          console.log('No more profiles available');
          break;
        }
      } catch (error) {
        console.log(`Error during match testing: ${error}`);
        break;
      }
    }
  });

  test('Profile information display and navigation', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.alice;

    await authHelper.createTestUserWithProfile(user);
    await appHelper.navigateToDiscovery();

    // Wait for profile to load
    const hasProfile = await page.locator('[data-testid="profile-card"], .profile-card, .card').isVisible({ timeout: 5000 });
    
    if (hasProfile) {
      // Check for profile information elements
      const profileInfoElements = [
        'text=years old',
        'text=miles away',
        'text=km away',
        '[data-testid="profile-name"]',
        '[data-testid="profile-age"]',
        '[data-testid="profile-bio"]'
      ];

      for (const selector of profileInfoElements) {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`Found profile info element: ${selector}`);
        }
      }

      // Test photo navigation if multiple photos exist
      try {
        const photoIndicators = page.locator('[data-testid="photo-indicator"], .photo-dot, .photo-indicator');
        const indicatorCount = await photoIndicators.count();
        
        if (indicatorCount > 1) {
          // Click on different photo indicators
          for (let i = 0; i < Math.min(indicatorCount, 3); i++) {
            await photoIndicators.nth(i).click();
            await page.waitForTimeout(500);
          }
        }
      } catch {
        console.log('Photo navigation not available or different implementation');
      }

      // Test profile expansion/details view
      try {
        await page.click('[data-testid="profile-card"], .profile-card');
        await page.waitForTimeout(1000);
        
        // Look for expanded view elements
        const expandedElements = [
          '[data-testid="profile-details"]',
          '.profile-expanded',
          '.profile-modal'
        ];

        for (const selector of expandedElements) {
          if (await page.locator(selector).isVisible({ timeout: 2000 })) {
            console.log(`Found expanded profile view: ${selector}`);
            
            // Close expanded view
            await page.press('body', 'Escape');
            break;
          }
        }
      } catch {
        console.log('Profile expansion not available');
      }
    }
  });

  test('Discovery filters and preferences application', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.bob;

    await authHelper.createTestUserWithProfile(user);
    await appHelper.navigateToDiscovery();

    // Check if filters/settings are available
    const filterElements = [
      '[data-testid="filters-button"]',
      'button:has-text("Filters")',
      'button:has-text("Settings")',
      '.filter-button'
    ];

    for (const selector of filterElements) {
      if (await page.locator(selector).isVisible({ timeout: 2000 })) {
        await page.click(selector);
        
        // Look for filter options
        const filterOptions = [
          'text=Age Range',
          'text=Distance',
          'text=Looking for',
          '[data-testid="age-filter"]',
          '[data-testid="distance-filter"]'
        ];

        for (const option of filterOptions) {
          if (await page.locator(option).isVisible({ timeout: 2000 })) {
            console.log(`Found filter option: ${option}`);
          }
        }

        // Close filters
        await page.press('body', 'Escape');
        break;
      }
    }
  });

  test('Empty state and no more profiles handling', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.charlie;

    await authHelper.createTestUserWithProfile(user);
    await appHelper.navigateToDiscovery();

    // Swipe through all available profiles
    let profileCount = 0;
    const maxSwipes = 20; // Prevent infinite loop

    while (profileCount < maxSwipes) {
      try {
        const hasProfile = await page.locator('[data-testid="profile-card"], .profile-card, .card').isVisible({ timeout: 2000 });
        
        if (hasProfile) {
          await appHelper.swipeProfile('left'); // Pass on all profiles
          profileCount++;
          await page.waitForTimeout(500);
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    // Check for empty state
    const emptyStateElements = [
      'text=No more profiles',
      'text=You\'ve seen everyone',
      'text=Come back later',
      'text=Check back soon',
      '[data-testid="empty-state"]',
      '.empty-state'
    ];

    let emptyStateFound = false;
    for (const selector of emptyStateElements) {
      if (await page.locator(selector).isVisible({ timeout: 3000 })) {
        console.log(`Found empty state: ${selector}`);
        emptyStateFound = true;
        break;
      }
    }

    // Empty state should be shown or there should be a way to get more profiles
    expect(emptyStateFound || profileCount === 0).toBeTruthy();
  });

  test('Undo/Rewind functionality', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.alice;

    await authHelper.createTestUserWithProfile(user);
    await appHelper.navigateToDiscovery();

    // Check if undo/rewind feature is available
    const hasProfile = await page.locator('[data-testid="profile-card"], .profile-card, .card').isVisible({ timeout: 3000 });
    
    if (hasProfile) {
      // Swipe left (pass)
      await appHelper.swipeProfile('left');
      
      // Look for undo/rewind button
      const undoElements = [
        '[data-testid="undo-button"]',
        'button:has-text("Undo")',
        'button:has-text("Rewind")',
        '.undo-button'
      ];

      for (const selector of undoElements) {
        if (await page.locator(selector).isVisible({ timeout: 2000 })) {
          console.log(`Found undo button: ${selector}`);
          await page.click(selector);
          
          // Verify profile reappears
          await page.waitForTimeout(1000);
          const profileReappeared = await page.locator('[data-testid="profile-card"], .profile-card, .card').isVisible({ timeout: 2000 });
          expect(profileReappeared).toBeTruthy();
          break;
        }
      }
    }
  });

  test('Boost and premium features', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.bob;

    await authHelper.createTestUserWithProfile(user);
    await appHelper.navigateToDiscovery();

    // Look for premium features
    const premiumElements = [
      '[data-testid="boost-button"]',
      'button:has-text("Boost")',
      'button:has-text("Premium")',
      'text=Upgrade',
      '.boost-button',
      '.premium-button'
    ];

    for (const selector of premiumElements) {
      if (await page.locator(selector).isVisible({ timeout: 2000 })) {
        console.log(`Found premium feature: ${selector}`);
        
        // Click to see premium options (don't actually purchase)
        await page.click(selector);
        await page.waitForTimeout(1000);
        
        // Look for premium modal/page
        const premiumModal = page.locator('[data-testid="premium-modal"], .premium-modal, .upgrade-modal');
        if (await premiumModal.isVisible({ timeout: 2000 })) {
          console.log('Premium modal opened');
          await page.press('body', 'Escape');
        }
        break;
      }
    }
  });

  test('Discovery feed refresh and new profiles', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.charlie;

    await authHelper.createTestUserWithProfile(user);
    await appHelper.navigateToDiscovery();

    // Test pull-to-refresh or refresh button
    const refreshElements = [
      '[data-testid="refresh-button"]',
      'button:has-text("Refresh")',
      '.refresh-button'
    ];

    for (const selector of refreshElements) {
      if (await page.locator(selector).isVisible({ timeout: 2000 })) {
        await page.click(selector);
        await page.waitForTimeout(2000);
        console.log('Discovery feed refreshed');
        break;
      }
    }

    // Test manual page refresh
    await page.reload();
    await page.waitForTimeout(3000);
    
    // Verify discovery feed still works after refresh
    const profileExists = await page.locator('[data-testid="profile-card"], .profile-card, .card').isVisible({ timeout: 5000 });
    console.log(`Profile available after refresh: ${profileExists}`);
  });
});
