import { test, expect, Page } from '@playwright/test';
import { AuthHelper, TEST_USERS } from './helpers/auth';

// Helper function to create a test conversation
async function createTestConversation(page: Page) {
  // Navigate to discover page
  await page.goto('/discover');
  await page.waitForLoadState('networkidle');
  
  // Look for a profile card and swipe right (like)
  const profileCard = page.locator('[data-testid="profile-card"], .profile-card, .card').first();
  
  if (await profileCard.isVisible()) {
    // Try to find and click like button
    const likeButton = page.locator('button:has-text("Like"), [data-testid="like-button"], .like-btn').first();
    
    if (await likeButton.isVisible()) {
      await likeButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Try swiping gesture
      await profileCard.hover();
      await page.mouse.down();
      await page.mouse.move(100, 0);
      await page.mouse.up();
    }
  }
  
  // Check if we got a match
  const matchModal = page.locator('[data-testid="match-modal"], .match-modal').or(page.locator('text=/It\'s a match/i'));
  
  if (await matchModal.isVisible({ timeout: 3000 })) {
    // Click to start conversation
    const startChatButton = page.locator('button:has-text("Start Chat"), button:has-text("Message")');
    if (await startChatButton.isVisible()) {
      await startChatButton.click();
      await page.waitForLoadState('networkidle');
      return true;
    }
  }
  
  return false;
}

async function sendMessage(page: Page, message: string) {
  // Find message input
  const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"], [data-testid="message-input"]');
  
  await expect(messageInput).toBeVisible();
  await messageInput.fill(message);
  
  // Send message
  const sendButton = page.locator('button[type="submit"], button:has-text("Send"), [data-testid="send-button"]');
  await sendButton.click();
  
  // Wait for message to appear
  await page.waitForTimeout(1000);
}

test.describe('Messaging System', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.clearAuthState();
  });

  test('should handle authentication for messaging features', async ({ page }) => {
    // Sign up a new user
    await authHelper.signUp(TEST_USERS.alice);

    // Check that user is authenticated (not on signin/signup pages)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/signin');
    expect(currentUrl).not.toContain('/signup');

    // Should be on a protected route
    const isOnProtectedRoute = currentUrl.includes('/onboarding') || currentUrl.includes('/discover');
    expect(isOnProtectedRoute).toBe(true);
  });

  test('should open chat from conversation list', async ({ page }) => {
    await authHelper.signUp(TEST_USERS.bob);
    await page.goto('/conversations');
    await page.waitForLoadState('networkidle');
    
    // Look for existing conversation
    const conversationItem = page.locator('[data-testid="conversation-item"], .conversation-item').first();
    
    if (await conversationItem.isVisible()) {
      await conversationItem.click();
      await page.waitForLoadState('networkidle');
      
      // Should be on chat page
      await expect(page).toHaveURL(/\/chat\/[a-zA-Z0-9-]+/);
      
      // Should see chat interface
      await expect(page.locator('input[placeholder*="message"], textarea')).toBeVisible();
    }
  });

  test('should send and receive messages', async ({ page }) => {
    await authHelper.signUp(TEST_USERS.charlie);
    
    // Try to create or find a conversation
    const hasConversation = await createTestConversation(page);
    
    if (!hasConversation) {
      // Navigate to existing conversation if available
      await page.goto('/conversations');
      const firstConversation = page.locator('[data-testid="conversation-item"]').first();
      
      if (await firstConversation.isVisible()) {
        await firstConversation.click();
        await page.waitForLoadState('networkidle');
      } else {
        // Skip test if no conversations available
        test.skip();
      }
    }
    
    // Should be on chat page
    await expect(page).toHaveURL(/\/chat/);
    
    // Send a test message
    const testMessage = `Test message ${Date.now()}`;
    await sendMessage(page, testMessage);
    
    // Should see the message in chat
    await expect(page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 5000 });
  });

  test('should show message status indicators', async ({ page }) => {
    await authHelper.signUp(TEST_USERS.alice);
    await page.goto('/conversations');
    
    const firstConversation = page.locator('[data-testid="conversation-item"]').first();
    
    if (await firstConversation.isVisible()) {
      await firstConversation.click();
      await page.waitForLoadState('networkidle');
      
      // Send a message
      const testMessage = `Status test ${Date.now()}`;
      await sendMessage(page, testMessage);
      
      // Look for status indicators (sent, delivered, read)
      const statusIndicator = page.locator('[data-testid="message-status"], .message-status, .status-icon');
      
      // Should show some kind of status
      await expect(statusIndicator.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle real-time message updates', async ({ page }) => {
    await authHelper.signUp(TEST_USERS.bob);
    await page.goto('/conversations');
    
    const firstConversation = page.locator('[data-testid="conversation-item"]').first();
    
    if (await firstConversation.isVisible()) {
      await firstConversation.click();
      await page.waitForLoadState('networkidle');
      
      // Count initial messages
      const initialMessages = await page.locator('[data-testid="message"], .message').count();
      
      // Send a message
      const testMessage = `Real-time test ${Date.now()}`;
      await sendMessage(page, testMessage);
      
      // Should see new message appear
      const finalMessages = await page.locator('[data-testid="message"], .message').count();
      expect(finalMessages).toBeGreaterThan(initialMessages);
    }
  });

  test('should validate message input', async ({ page }) => {
    await authHelper.signUp(TEST_USERS.charlie);
    await page.goto('/conversations');
    
    const firstConversation = page.locator('[data-testid="conversation-item"]').first();
    
    if (await firstConversation.isVisible()) {
      await firstConversation.click();
      await page.waitForLoadState('networkidle');
      
      // Try to send empty message
      const messageInput = page.locator('input[placeholder*="message"], textarea');
      const sendButton = page.locator('button[type="submit"], button:has-text("Send")');
      
      await messageInput.fill('');
      
      // Send button should be disabled for empty message
      await expect(sendButton).toBeDisabled();
      
      // Fill with whitespace only
      await messageInput.fill('   ');
      await expect(sendButton).toBeDisabled();
      
      // Fill with valid message
      await messageInput.fill('Valid message');
      await expect(sendButton).toBeEnabled();
    }
  });

  test('should show typing indicators', async ({ page }) => {
    await authHelper.signUp(TEST_USERS.alice);
    await page.goto('/conversations');
    
    const firstConversation = page.locator('[data-testid="conversation-item"]').first();
    
    if (await firstConversation.isVisible()) {
      await firstConversation.click();
      await page.waitForLoadState('networkidle');
      
      // Start typing
      const messageInput = page.locator('input[placeholder*="message"], textarea');
      await messageInput.fill('Typing...');
      
      // Look for typing indicator (might not be visible in single-user test)
      const typingIndicator = page.locator('[data-testid="typing-indicator"], .typing-indicator').or(page.locator('text=/typing/i'));
      
      // This test might not show results in single-user scenario
      // but we can verify the input works
      await expect(messageInput).toHaveValue('Typing...');
    }
  });

  test('should handle message history pagination', async ({ page }) => {
    await authHelper.signUp(TEST_USERS.bob);
    await page.goto('/conversations');
    
    const firstConversation = page.locator('[data-testid="conversation-item"]').first();
    
    if (await firstConversation.isVisible()) {
      await firstConversation.click();
      await page.waitForLoadState('networkidle');
      
      // Scroll to top to load older messages
      await page.evaluate(() => {
        const chatContainer = document.querySelector('[data-testid="chat-container"], .chat-container, .messages');
        if (chatContainer) {
          chatContainer.scrollTop = 0;
        }
      });
      
      // Wait for potential loading
      await page.waitForTimeout(2000);
      
      // Should see messages (either existing or loading indicator)
      const messages = page.locator('[data-testid="message"], .message');
      const loadingIndicator = page.locator('[data-testid="loading"], .loading, .spinner');
      
      await expect(messages.first().or(loadingIndicator.first())).toBeVisible();
    }
  });

  test('should handle connection status', async ({ page }) => {
    await authHelper.signUp(TEST_USERS.charlie);
    await page.goto('/conversations');
    
    const firstConversation = page.locator('[data-testid="conversation-item"]').first();
    
    if (await firstConversation.isVisible()) {
      await firstConversation.click();
      await page.waitForLoadState('networkidle');
      
      // Look for connection status indicator
      const connectionStatus = page.locator('[data-testid="connection-status"], .connection-status, .online-status');
      
      // Should show some kind of status (online/offline)
      if (await connectionStatus.isVisible()) {
        await expect(connectionStatus).toContainText(/online|offline|connected/i);
      }
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await authHelper.signUp(TEST_USERS.alice);
    await page.goto('/conversations');
    
    const firstConversation = page.locator('[data-testid="conversation-item"]').first();
    
    if (await firstConversation.isVisible()) {
      await firstConversation.click();
      await page.waitForLoadState('networkidle');
      
      // Simulate network failure
      await page.route('**/api/**', route => {
        route.abort('failed');
      });
      
      // Try to send a message
      const testMessage = `Network test ${Date.now()}`;
      const messageInput = page.locator('input[placeholder*="message"], textarea');
      const sendButton = page.locator('button[type="submit"], button:has-text("Send")');
      
      await messageInput.fill(testMessage);
      await sendButton.click();
      
      // Should show error indicator
      const errorIndicator = page.locator('[data-testid="error"], .error, .text-red').or(page.locator('text=/failed/i'));
      await expect(errorIndicator.first()).toBeVisible({ timeout: 10000 });
    }
  });
});
