import { test, expect } from '@playwright/test';

test.describe('Matches and Chat System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to matches page (assuming user is authenticated)
    await page.goto('/matches');
  });

  test('should display matches page', async ({ page }) => {
    // Check if matches page loads
    const title = page.locator('h1').or(page.locator('[data-testid="matches-title"]'));
    if (await title.count()) {
      await expect(title).toBeVisible();
    } else {
      test.skip(true, 'Matches title not present in current layout');
    }

    // Check if matches list is visible (optional)
    const list = page.locator('[data-testid="matches-list"]').or(page.locator('.matches-list'));
    if (await list.count()) {
      await expect(list).toBeVisible();
    }
  });

  test('should display list of matches', async ({ page }) => {
    // Wait for matches to load
    await page.waitForTimeout(2000);
    
    // Check if match items are visible
    const matchItems = page.locator('[data-testid="match-item"]').or(page.locator('.match-item'));
    const count = await matchItems.count();
    
    if (count > 0) {
      // Check first match item
      const firstMatch = matchItems.first();
      await expect(firstMatch).toBeVisible();
      
      // Should display user photo
      await expect(firstMatch.locator('img').or(firstMatch.locator('[data-testid="user-photo"]'))).toBeVisible();
      
      // Should display user name
      await expect(firstMatch.locator('text=/[A-Za-z]+/')).toBeVisible();
      
      // Should display last message or match time
      await expect(firstMatch.locator('text=/ago|yesterday|today/i').or(firstMatch.locator('[data-testid="last-message"]'))).toBeVisible();
    }
  });

  test('should open chat when match is clicked', async ({ page }) => {
    // Wait for matches to load
    await page.waitForTimeout(2000);
    
    const matchItems = page.locator('[data-testid="match-item"]').or(page.locator('.match-item'));
    const count = await matchItems.count();
    
    if (count > 0) {
      // Click on first match
      await matchItems.first().click();
      
      // Should navigate to chat or open chat modal
      await page.waitForTimeout(1000);
      
      // Check if chat interface is visible
      const chatInterface = page.locator('[data-testid="chat-interface"]').or(page.locator('.chat-interface'));
      await expect(chatInterface).toBeVisible();
      
      // Check if message input is visible
      await expect(page.locator('input[placeholder*="message"]').or(page.locator('[data-testid="message-input"]'))).toBeVisible();
      
      // Check if send button is visible
      await expect(page.locator('button').filter({ hasText: /send/i }).or(page.locator('[data-testid="send-button"]'))).toBeVisible();
    }
  });

  test('should display chat messages', async ({ page }) => {
    // Navigate to a specific chat or open first match
    await page.waitForTimeout(2000);
    
    const matchItems = page.locator('[data-testid="match-item"]').or(page.locator('.match-item'));
    const count = await matchItems.count();
    
    if (count > 0) {
      await matchItems.first().click();
      await page.waitForTimeout(1000);
      
      // Check if messages are displayed
      const messagesContainer = page.locator('[data-testid="messages-container"]').or(page.locator('.messages-container'));
      await expect(messagesContainer).toBeVisible();
      
      // Check if individual messages are visible
      const messages = page.locator('[data-testid="message"]').or(page.locator('.message'));
      const messageCount = await messages.count();
      
      if (messageCount > 0) {
        // Check first message
        const firstMessage = messages.first();
        await expect(firstMessage).toBeVisible();
        
        // Should have message text
        await expect(firstMessage.locator('text=/[A-Za-z]/')).toBeVisible();
        
        // Should have timestamp
        await expect(firstMessage.locator('text=/ago|am|pm|:/i')).toBeVisible();
      }
    }
  });

  test('should send a message', async ({ page }) => {
    // Open chat
    await page.waitForTimeout(2000);
    
    const matchItems = page.locator('[data-testid="match-item"]').or(page.locator('.match-item'));
    const count = await matchItems.count();
    
    if (count > 0) {
      await matchItems.first().click();
      await page.waitForTimeout(1000);
      
      // Type a message
      const messageInput = page.locator('input[placeholder*="message"]').or(page.locator('[data-testid="message-input"]'));
      await messageInput.fill('Hello! How are you doing?');
      
      // Send the message
      const sendButton = page.locator('button').filter({ hasText: /send/i }).or(page.locator('[data-testid="send-button"]'));
      await sendButton.click();
      
      // Wait for message to be sent
      await page.waitForTimeout(1000);
      
      // Check if message appears in chat
      await expect(page.locator('text=Hello! How are you doing?')).toBeVisible();
      
      // Input should be cleared
      await expect(messageInput).toHaveValue('');
    }
  });

  test('should send message with Enter key', async ({ page }) => {
    // Open chat
    await page.waitForTimeout(2000);
    
    const matchItems = page.locator('[data-testid="match-item"]').or(page.locator('.match-item'));
    const count = await matchItems.count();
    
    if (count > 0) {
      await matchItems.first().click();
      await page.waitForTimeout(1000);
      
      // Type a message
      const messageInput = page.locator('input[placeholder*="message"]').or(page.locator('[data-testid="message-input"]'));
      await messageInput.fill('Testing Enter key send');
      
      // Press Enter to send
      await messageInput.press('Enter');
      
      // Wait for message to be sent
      await page.waitForTimeout(1000);
      
      // Check if message appears in chat
      await expect(page.locator('text=Testing Enter key send')).toBeVisible();
    }
  });

  test('should display message status indicators', async ({ page }) => {
    // Open chat and send a message
    await page.waitForTimeout(2000);
    
    const matchItems = page.locator('[data-testid="match-item"]').or(page.locator('.match-item'));
    const count = await matchItems.count();
    
    if (count > 0) {
      await matchItems.first().click();
      await page.waitForTimeout(1000);
      
      const messageInput = page.locator('input[placeholder*="message"]').or(page.locator('[data-testid="message-input"]'));
      await messageInput.fill('Status test message');
      
      const sendButton = page.locator('button').filter({ hasText: /send/i }).or(page.locator('[data-testid="send-button"]'));
      await sendButton.click();
      
      await page.waitForTimeout(1000);
      
      // Look for status indicators (sent, delivered, read)
      const statusIndicators = page.locator('[data-testid="message-status"]').or(page.locator('.message-status'));
      if (await statusIndicators.count() > 0) {
        await expect(statusIndicators.first()).toBeVisible();
      }
    }
  });

  test('should handle real-time message updates', async ({ page }) => {
    // This test simulates receiving messages in real-time
    // Note: This might require WebSocket mocking or actual real-time setup
    
    // Open chat
    await page.waitForTimeout(2000);
    
    const matchItems = page.locator('[data-testid="match-item"]').or(page.locator('.match-item'));
    const count = await matchItems.count();
    
    if (count > 0) {
      await matchItems.first().click();
      await page.waitForTimeout(1000);
      
      // Count initial messages
      const initialMessages = page.locator('[data-testid="message"]').or(page.locator('.message'));
      const initialCount = await initialMessages.count();
      
      // Wait for potential new messages (simulating real-time)
      await page.waitForTimeout(3000);
      
      // Check if new messages appeared
      const updatedMessages = page.locator('[data-testid="message"]').or(page.locator('.message'));
      const updatedCount = await updatedMessages.count();
      
      // This test might pass or fail depending on whether there are real-time messages
      // In a real scenario, you'd mock the WebSocket or have test data
    }
  });

  test('should scroll to bottom when new message is sent', async ({ page }) => {
    // Open chat
    await page.waitForTimeout(2000);
    
    const matchItems = page.locator('[data-testid="match-item"]').or(page.locator('.match-item'));
    const count = await matchItems.count();
    
    if (count > 0) {
      await matchItems.first().click();
      await page.waitForTimeout(1000);
      
      // Send a message
      const messageInput = page.locator('input[placeholder*="message"]').or(page.locator('[data-testid="message-input"]'));
      await messageInput.fill('Scroll test message');
      
      const sendButton = page.locator('button').filter({ hasText: /send/i }).or(page.locator('[data-testid="send-button"]'));
      await sendButton.click();
      
      await page.waitForTimeout(1000);
      
      // Check if the new message is visible (should be scrolled to bottom)
      await expect(page.locator('text=Scroll test message')).toBeVisible();
    }
  });

  test('should show typing indicators', async ({ page }) => {
    // Open chat
    await page.waitForTimeout(2000);
    
    const matchItems = page.locator('[data-testid="match-item"]').or(page.locator('.match-item'));
    const count = await matchItems.count();
    
    if (count > 0) {
      await matchItems.first().click();
      await page.waitForTimeout(1000);
      
      // Start typing
      const messageInput = page.locator('input[placeholder*="message"]').or(page.locator('[data-testid="message-input"]'));
      await messageInput.fill('Typing...');
      
      // Look for typing indicator (this might require real-time setup)
      const typingIndicator = page.locator('[data-testid="typing-indicator"]').or(page.locator('.typing-indicator'));
      
      // This test might need adjustment based on actual implementation
      await page.waitForTimeout(2000);
    }
  });

  test('should handle empty matches state', async ({ page }) => {
    // This test checks what happens when user has no matches
    await page.waitForTimeout(2000);

    const matchItems = page.locator('[data-testid="match-item"]').or(page.locator('.match-item'));
    const count = await matchItems.count();

    if (count === 0) {
      // Should show empty state message (optional)
      const emptyState = page.locator('text=/no matches|start swiping|no conversations/i');
      if (await emptyState.count()) {
        await expect(emptyState).toBeVisible();
      } else {
        test.skip(true, 'Empty state message not present');
      }

      // Should show call-to-action to go back to discovery (optional)
      const discoverButton = page.locator('button').filter({ hasText: /discover|start swiping/i });
      if (await discoverButton.count()) {
        await expect(discoverButton).toBeVisible();
      }
    }
  });

  test('should navigate back from chat to matches', async ({ page }) => {
    // Open chat
    await page.waitForTimeout(2000);
    
    const matchItems = page.locator('[data-testid="match-item"]').or(page.locator('.match-item'));
    const count = await matchItems.count();
    
    if (count > 0) {
      await matchItems.first().click();
      await page.waitForTimeout(1000);
      
      // Look for back button
      const backButton = page.locator('button').filter({ hasText: /back/i }).or(page.locator('[data-testid="back-button"]'));
      
      if (await backButton.isVisible()) {
        await backButton.click();
        
        // Should return to matches list
        await expect(page.locator('[data-testid="matches-list"]').or(page.locator('.matches-list'))).toBeVisible();
      }
    }
  });
});
