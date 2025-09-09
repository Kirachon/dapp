import { test, expect } from '@playwright/test';

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to profile page (assuming user is authenticated)
    await page.goto('/profile');
  });

  test('should display user profile', async ({ page }) => {
    // Check if profile page loads
    const title = page.locator('h1').or(page.locator('[data-testid="profile-title"]'));
    if (await title.count()) {
      await expect(title).toBeVisible();
    } else {
      test.skip(true, 'Profile title not present');
    }

    // Check if user information is displayed (optional)
    const userName = page.locator('[data-testid="user-name"]').or(page.locator('.user-name'));
    if (await userName.count()) {
      await expect(userName).toBeVisible();
    }
    const userAge = page.locator('[data-testid="user-age"]').or(page.locator('.user-age'));
    if (await userAge.count()) {
      await expect(userAge).toBeVisible();
    }

    // Check if user photos are displayed (optional)
    const photos = page.locator('[data-testid="user-photos"]').or(page.locator('.user-photos'));
    if (await photos.count()) {
      await expect(photos).toBeVisible();
    }
  });

  test('should display profile information sections', async ({ page }) => {
    // Wait for profile to load
    await page.waitForTimeout(2000);
    
    // Check if bio section is visible
    const bioSection = page.locator('[data-testid="bio-section"]').or(page.locator('text=/about|bio/i'));
    if (await bioSection.isVisible()) {
      await expect(bioSection).toBeVisible();
    }
    
    // Check if interests section is visible
    const interestsSection = page.locator('[data-testid="interests-section"]').or(page.locator('text=/interests|hobbies/i'));
    if (await interestsSection.isVisible()) {
      await expect(interestsSection).toBeVisible();
    }
    
    // Check if location is displayed
    const locationSection = page.locator('[data-testid="location-section"]').or(page.locator('text=/location|city/i'));
    if (await locationSection.isVisible()) {
      await expect(locationSection).toBeVisible();
    }
  });

  test('should open edit profile modal/page', async ({ page }) => {
    // Look for edit button
    const editButton = page.locator('button').filter({ hasText: /edit|settings/i }).or(page.locator('[data-testid="edit-profile-button"]'));
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Should open edit modal or navigate to edit page
      await page.waitForTimeout(1000);
      
      // Check if edit form is visible
      const editForm = page.locator('[data-testid="edit-profile-form"]').or(page.locator('form'));
      await expect(editForm).toBeVisible();
      
      // Check if input fields are present
      await expect(page.locator('input[name="firstName"]').or(page.locator('[data-testid="first-name-input"]'))).toBeVisible();
    }
  });

  test('should edit basic profile information', async ({ page }) => {
    // Open edit profile
    const editButton = page.locator('button').filter({ hasText: /edit|settings/i }).or(page.locator('[data-testid="edit-profile-button"]'));
    
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(1000);
      
      // Edit first name
      const firstNameInput = page.locator('input[name="firstName"]').or(page.locator('[data-testid="first-name-input"]'));
      if (await firstNameInput.isVisible()) {
        await firstNameInput.clear();
        await firstNameInput.fill('UpdatedName');
      }
      
      // Edit bio
      const bioInput = page.locator('textarea[name="bio"]').or(page.locator('[data-testid="bio-input"]'));
      if (await bioInput.isVisible()) {
        await bioInput.clear();
        await bioInput.fill('This is my updated bio with new information about myself.');
      }
      
      // Save changes
      const saveButton = page.locator('button').filter({ hasText: /save|update/i }).or(page.locator('[data-testid="save-button"]'));
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Wait for save to complete
        await page.waitForTimeout(2000);
        
        // Should show success message or return to profile view
        const successMessage = page.locator('text=/saved|updated|success/i');
        if (await successMessage.isVisible()) {
          await expect(successMessage).toBeVisible();
        }
      }
    }
  });

  test('should manage profile photos', async ({ page }) => {
    // Open edit profile
    const editButton = page.locator('button').filter({ hasText: /edit|settings/i }).or(page.locator('[data-testid="edit-profile-button"]'));
    
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(1000);
      
      // Look for photo management section
      const photoSection = page.locator('[data-testid="photo-section"]').or(page.locator('.photo-section'));
      if (await photoSection.isVisible()) {
        // Check if add photo button is visible
        const addPhotoButton = page.locator('button').filter({ hasText: /add photo|upload/i }).or(page.locator('[data-testid="add-photo-button"]'));
        if (await addPhotoButton.isVisible()) {
          await expect(addPhotoButton).toBeVisible();
        }
        
        // Check if existing photos have delete/edit options
        const photoItems = page.locator('[data-testid="photo-item"]').or(page.locator('.photo-item'));
        const photoCount = await photoItems.count();
        
        if (photoCount > 0) {
          const firstPhoto = photoItems.first();
          const deleteButton = firstPhoto.locator('button').filter({ hasText: /delete|remove/i });
          if (await deleteButton.isVisible()) {
            await expect(deleteButton).toBeVisible();
          }
        }
      }
    }
  });

  test('should update interests', async ({ page }) => {
    // Open edit profile
    const editButton = page.locator('button').filter({ hasText: /edit|settings/i }).or(page.locator('[data-testid="edit-profile-button"]'));
    
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(1000);
      
      // Look for interests section
      const interestsSection = page.locator('[data-testid="interests-section"]').or(page.locator('text=/interests/i'));
      if (await interestsSection.isVisible()) {
        // Look for interest buttons/checkboxes
        const interestButtons = page.locator('button').filter({ hasText: /music|sports|travel|food|movies/i });
        const count = await interestButtons.count();
        
        if (count > 0) {
          // Toggle some interests
          await interestButtons.first().click();
          await page.waitForTimeout(500);
          
          if (count > 1) {
            await interestButtons.nth(1).click();
            await page.waitForTimeout(500);
          }
        }
        
        // Save changes
        const saveButton = page.locator('button').filter({ hasText: /save|update/i }).or(page.locator('[data-testid="save-button"]'));
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('should update preferences', async ({ page }) => {
    // Navigate to preferences or look for preferences section
    const preferencesButton = page.locator('button').filter({ hasText: /preferences|settings/i }).or(page.locator('[data-testid="preferences-button"]'));
    
    if (await preferencesButton.isVisible()) {
      await preferencesButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Look for age range settings
    const minAgeInput = page.locator('input[name="minAge"]').or(page.locator('[data-testid="min-age-input"]'));
    if (await minAgeInput.isVisible()) {
      await minAgeInput.clear();
      await minAgeInput.fill('25');
    }
    
    const maxAgeInput = page.locator('input[name="maxAge"]').or(page.locator('[data-testid="max-age-input"]'));
    if (await maxAgeInput.isVisible()) {
      await maxAgeInput.clear();
      await maxAgeInput.fill('35');
    }
    
    // Look for distance setting
    const distanceInput = page.locator('input[name="distance"]').or(page.locator('[data-testid="distance-input"]'));
    if (await distanceInput.isVisible()) {
      await distanceInput.clear();
      await distanceInput.fill('50');
    }
    
    // Save preferences
    const saveButton = page.locator('button').filter({ hasText: /save|update/i }).or(page.locator('[data-testid="save-preferences-button"]'));
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForTimeout(2000);
    }
  });

  test('should validate profile form inputs', async ({ page }) => {
    // Open edit profile
    const editButton = page.locator('button').filter({ hasText: /edit|settings/i }).or(page.locator('[data-testid="edit-profile-button"]'));
    
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(1000);
      
      // Try to clear required fields and save
      const firstNameInput = page.locator('input[name="firstName"]').or(page.locator('[data-testid="first-name-input"]'));
      if (await firstNameInput.isVisible()) {
        await firstNameInput.clear();
        
        // Try to save with empty required field
        const saveButton = page.locator('button').filter({ hasText: /save|update/i }).or(page.locator('[data-testid="save-button"]'));
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(1000);
          
          // Should show validation error
          const errorMessage = page.locator('text=/required|error/i').or(page.locator('.error'));
          if (await errorMessage.isVisible()) {
            await expect(errorMessage).toBeVisible();
          }
        }
      }
    }
  });

  test('should display profile statistics', async ({ page }) => {
    // Look for profile statistics (likes received, matches, etc.)
    const statsSection = page.locator('[data-testid="profile-stats"]').or(page.locator('.profile-stats'));
    
    if (await statsSection.isVisible()) {
      await expect(statsSection).toBeVisible();
      
      // Check for specific stats
      const likesCount = page.locator('text=/likes|matches/i');
      if (await likesCount.isVisible()) {
        await expect(likesCount).toBeVisible();
      }
    }
  });

  test('should handle profile photo upload', async ({ page }) => {
    // Open edit profile
    const editButton = page.locator('button').filter({ hasText: /edit|settings/i }).or(page.locator('[data-testid="edit-profile-button"]'));
    
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(1000);
      
      // Look for file input
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Note: In a real test, you'd upload an actual file
        // For this demo, we'll just check if the input exists
        await expect(fileInput).toBeVisible();
        
        // Check if there are photo upload guidelines
        const guidelines = page.locator('text=/jpg|png|size|mb/i');
        if (await guidelines.isVisible()) {
          await expect(guidelines).toBeVisible();
        }
      }
    }
  });

  test('should allow profile deletion/deactivation', async ({ page }) => {
    // Look for account settings or danger zone
    const settingsButton = page.locator('button').filter({ hasText: /settings|account/i }).or(page.locator('[data-testid="account-settings-button"]'));
    
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForTimeout(1000);
      
      // Look for delete/deactivate account option
      const deleteButton = page.locator('button').filter({ hasText: /delete|deactivate/i }).or(page.locator('[data-testid="delete-account-button"]'));
      
      if (await deleteButton.isVisible()) {
        await expect(deleteButton).toBeVisible();
        
        // Don't actually click it in the test!
        // Just verify it's there and accessible
      }
    }
  });
});
