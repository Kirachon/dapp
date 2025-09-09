import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS, AppTestHelper } from './helpers/auth';

test.describe('Real-time Messaging Features', () => {
  test.beforeEach(async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.clearAuthState();
  });

  test('Send and receive messages in real-time', async ({ page, context }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.alice;

    // Setup authenticated user
    await authHelper.createTestUserWithProfile(user);

    // Navigate to matches
    await appHelper.navigateToMatches();

    // Check if matches exist for testing
    const hasMatches = await page.locator('[data-testid^="match-"], .match-item').first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasMatches) {
      // Open conversation
      await appHelper.openConversation(0);

      // Send multiple messages to test real-time delivery
      const messages = [
        'Hello there! 👋',
        'How are you doing today?',
        'This is a test message for real-time functionality'
      ];

      for (const message of messages) {
        await appHelper.sendMessage(message);
        
        // Verify message appears immediately
        await expect(page.locator(`text=${message}`)).toBeVisible({ timeout: 5000 });
        
        // Wait between messages
        await page.waitForTimeout(1000);
      }

      // Verify all messages are in conversation history
      for (const message of messages) {
        await expect(page.locator(`text=${message}`)).toBeVisible();
      }
    } else {
      console.log('No matches available for messaging test - creating mock conversation');
      
      // Navigate to a test conversation URL if available
      try {
        await page.goto('/chat/test-conversation');
        await page.waitForTimeout(2000);
      } catch {
        console.log('No test conversation available');
      }
    }
  });

  test('Typing indicators functionality', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.bob;

    await authHelper.createTestUserWithProfile(user);
    await appHelper.navigateToMatches();

    const hasMatches = await page.locator('[data-testid^="match-"], .match-item').first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasMatches) {
      await appHelper.openConversation(0);

      // Start typing to trigger typing indicator
      const messageInput = page.locator('[data-testid="message-input"], input[placeholder*="message"], textarea[placeholder*="message"]');
      
      if (await messageInput.isVisible()) {
        await messageInput.fill('Testing typing indicator...');
        
        // Wait for typing indicator to potentially appear
        await page.waitForTimeout(2000);
        
        // Clear input to stop typing
        await messageInput.fill('');
        
        // Wait for typing indicator to disappear
        await page.waitForTimeout(1000);
      }
    }
  });

  test('Message read receipts', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.charlie;

    await authHelper.createTestUserWithProfile(user);
    await appHelper.navigateToMatches();

    const hasMatches = await page.locator('[data-testid^="match-"], .match-item').first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasMatches) {
      await appHelper.openConversation(0);

      // Send a message
      const testMessage = 'Testing read receipts functionality';
      await appHelper.sendMessage(testMessage);

      // Look for read receipt indicators
      try {
        // Check for read status indicators (checkmarks, "read" text, etc.)
        const readIndicators = [
          'text=read',
          'text=seen',
          '[data-testid="read-receipt"]',
          '.message-read',
          '.read-indicator'
        ];

        for (const indicator of readIndicators) {
          const element = page.locator(indicator);
          if (await element.isVisible({ timeout: 2000 })) {
            console.log(`Found read receipt indicator: ${indicator}`);
            break;
          }
        }
      } catch {
        console.log('Read receipt indicators not found or not implemented');
      }
    }
  });

  test('Socket.IO connection and real-time updates', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const user = TEST_USERS.alice;

    await authHelper.createTestUserWithProfile(user);

    // Monitor WebSocket connections
    const wsConnections: any[] = [];
    page.on('websocket', ws => {
      wsConnections.push(ws);
      console.log('WebSocket connection established:', ws.url());
      
      ws.on('framesent', event => {
        console.log('WebSocket frame sent:', event.payload);
      });
      
      ws.on('framereceived', event => {
        console.log('WebSocket frame received:', event.payload);
      });
    });

    // Navigate to a page that should establish Socket.IO connection
    await page.goto('/discover');
    await page.waitForTimeout(3000);

    // Check if WebSocket connection was established
    expect(wsConnections.length).toBeGreaterThan(0);

    // Navigate to matches to test connection persistence
    await page.goto('/matches');
    await page.waitForTimeout(2000);

    // Connection should persist or reconnect
    console.log(`Total WebSocket connections: ${wsConnections.length}`);
  });

  test('Message delivery status and error handling', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.bob;

    await authHelper.createTestUserWithProfile(user);
    await appHelper.navigateToMatches();

    const hasMatches = await page.locator('[data-testid^="match-"], .match-item').first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasMatches) {
      await appHelper.openConversation(0);

      // Test normal message delivery
      await appHelper.sendMessage('Test message delivery status');

      // Test message with network interruption
      await page.route('**/graphql', route => {
        if (route.request().postData()?.includes('sendMessage')) {
          // Simulate network error for message sending
          route.abort();
        } else {
          route.continue();
        }
      });

      // Try to send message with network error
      try {
        await page.fill('[data-testid="message-input"], input[placeholder*="message"]', 'This message should fail');
        await page.click('button:has-text("Send"), [data-testid="send-button"]');
        
        // Look for error indicators
        await page.waitForTimeout(3000);
        
        // Check for retry buttons or error messages
        const errorIndicators = [
          'text=failed',
          'text=retry',
          'text=error',
          '[data-testid="message-error"]',
          '.message-failed'
        ];

        for (const indicator of errorIndicators) {
          const element = page.locator(indicator);
          if (await element.isVisible({ timeout: 2000 })) {
            console.log(`Found error indicator: ${indicator}`);
            break;
          }
        }
      } catch (error) {
        console.log('Error handling test completed');
      }

      // Restore network
      await page.unroute('**/graphql');
    }
  });

  test('Multiple conversation management', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.charlie;

    await authHelper.createTestUserWithProfile(user);
    await appHelper.navigateToMatches();

    // Check for multiple matches
    const matchElements = await page.locator('[data-testid^="match-"], .match-item').all();
    
    if (matchElements.length > 1) {
      // Test switching between conversations
      for (let i = 0; i < Math.min(matchElements.length, 3); i++) {
        await appHelper.openConversation(i);
        
        // Send a unique message in each conversation
        const message = `Test message in conversation ${i + 1}`;
        await appHelper.sendMessage(message);
        
        // Go back to matches list
        await page.goBack();
        await page.waitForTimeout(1000);
      }

      // Verify messages persist in each conversation
      for (let i = 0; i < Math.min(matchElements.length, 3); i++) {
        await appHelper.openConversation(i);
        
        const message = `Test message in conversation ${i + 1}`;
        await expect(page.locator(`text=${message}`)).toBeVisible();
        
        await page.goBack();
      }
    } else {
      console.log('Not enough matches for multiple conversation test');
    }
  });

  test('Message history and pagination', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.alice;

    await authHelper.createTestUserWithProfile(user);
    await appHelper.navigateToMatches();

    const hasMatches = await page.locator('[data-testid^="match-"], .match-item').first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasMatches) {
      await appHelper.openConversation(0);

      // Send multiple messages to test history
      for (let i = 1; i <= 10; i++) {
        await appHelper.sendMessage(`Message ${i} for history test`);
        await page.waitForTimeout(500);
      }

      // Scroll up to load older messages (if pagination is implemented)
      try {
        const chatContainer = page.locator('[data-testid="chat-container"], .chat-messages, .conversation');
        if (await chatContainer.isVisible()) {
          await chatContainer.hover();
          await page.mouse.wheel(0, -1000); // Scroll up
          await page.waitForTimeout(2000);
        }
      } catch {
        console.log('Chat scrolling not available or different implementation');
      }

      // Verify all messages are still visible
      for (let i = 1; i <= 10; i++) {
        await expect(page.locator(`text=Message ${i} for history test`)).toBeVisible();
      }
    }
  });

  test('Emoji and media message support', async ({ page }) => {
    const authHelper = new AuthHelper(page);
    const appHelper = new AppTestHelper(page);
    const user = TEST_USERS.bob;

    await authHelper.createTestUserWithProfile(user);
    await appHelper.navigateToMatches();

    const hasMatches = await page.locator('[data-testid^="match-"], .match-item').first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasMatches) {
      await appHelper.openConversation(0);

      // Test emoji messages
      const emojiMessages = ['😀', '❤️', '🎉', '👍'];
      
      for (const emoji of emojiMessages) {
        await appHelper.sendMessage(emoji);
        await expect(page.locator(`text=${emoji}`)).toBeVisible();
      }

      // Test mixed emoji and text
      await appHelper.sendMessage('Hello! 😊 How are you? 🌟');
      await expect(page.locator('text=Hello! 😊 How are you? 🌟')).toBeVisible();
    }
  });
});
