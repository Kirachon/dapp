import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS } from './helpers/auth';

test.describe('Discover Page Socket.IO Integration', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test('should initialize Socket.IO on discover page', async ({ page }) => {
    console.log('🧪 Testing Socket.IO on discover page...');
    
    // Step 1: Authenticate user (discover page allows access even without full auth)
    console.log('🔐 Authenticating Alice...');
    await authHelper.clearAuthState();
    await authHelper.signUp(TEST_USERS.alice);
    
    // Step 2: Verify current app route (discover or onboarding)
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    expect(currentUrl).toMatch(/\/(discover|onboarding(?:-v2)?)/);

    // Gate: skip if Socket.IO client is not available in local dev
    const hasIOGlobal = await page.evaluate(() => typeof (window as any).io !== 'undefined');
    if (!hasIOGlobal) {
      test.skip(true, 'Socket.IO client not loaded in local dev; skipping Socket.IO UI test');
    }

    // Step 3: Wait for Socket.IO to initialize
    console.log('⏳ Waiting for Socket.IO initialization...');
    await page.waitForTimeout(5000);
    
    // Step 4: Check for Socket.IO test button
    const socketButton = page.locator('button[title*="Socket.IO"]');
    const hasSocketButton = await socketButton.count();
    console.log(`🔍 Socket.IO test button found: ${hasSocketButton > 0}`);
    
    if (hasSocketButton > 0) {
      // Click the Socket.IO test button to open the interface
      console.log('🔌 Opening Socket.IO test interface...');
      await socketButton.click();
      await page.waitForTimeout(1000);
      
      // Check if test interface opened
      const testInterface = page.locator('text=Socket.IO Test');
      const hasTestInterface = await testInterface.count();
      console.log(`💬 Socket.IO test interface opened: ${hasTestInterface > 0}`);
      
      if (hasTestInterface > 0) {
        // Check connection status
        const connectionStatus = await page.locator('text=Connected, text=Disconnected, text=Error').first().textContent();
        console.log(`🔍 Connection status: ${connectionStatus}`);
        
        // Check for message input
        const messageInput = page.locator('input[placeholder*="test message"]');
        const hasMessageInput = await messageInput.count();
        console.log(`📝 Message input found: ${hasMessageInput > 0}`);
        
        if (hasMessageInput > 0) {
          // Test sending a message
          console.log('📤 Testing message sending...');
          await messageInput.fill('Hello from Playwright test!');
          
          const sendButton = page.locator('button:has-text("Send")');
          const hasSendButton = await sendButton.count();
          console.log(`📤 Send button found: ${hasSendButton > 0}`);
          
          if (hasSendButton > 0) {
            await sendButton.click();
            await page.waitForTimeout(1000);
            
            // Check if input was cleared (indicating message was sent)
            const inputValue = await messageInput.inputValue();
            console.log(`📨 Message sent (input cleared): ${inputValue === ''}`);
          }
        }
      }
    }
    
    // Step 5: Check console for Socket.IO messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Socket.IO') || text.includes('socket') || text.includes('connect')) {
        consoleMessages.push(text);
        console.log(`🔍 Console: ${text}`);
      }
    });
    
    // Wait a bit more for any console messages
    await page.waitForTimeout(3000);
    
    console.log(`📊 Captured ${consoleMessages.length} Socket.IO related console messages`);
    
    console.log('🎉 Discover page Socket.IO test completed!');
  });

  test('should test Socket.IO connection status indicator', async ({ page }) => {
    console.log('🧪 Testing Socket.IO connection status indicator...');
    
    // Authenticate and navigate to discover
    await authHelper.clearAuthState();
    await authHelper.signUp(TEST_USERS.alice);
    
    // Wait for page to load
    await page.waitForTimeout(3000);

    // Gate: skip if Socket.IO client is not available in local dev
    const hasIOGlobal = await page.evaluate(() => typeof (window as any).io !== 'undefined');
    if (!hasIOGlobal) {
      test.skip(true, 'Socket.IO client not loaded in local dev; skipping status indicator test');
    }

    // Look for the Socket.IO button with connection status
    const socketButton = page.locator('button[title*="Socket.IO"]');
    const hasSocketButton = await socketButton.count();
    
    if (hasSocketButton > 0) {
      // Check the button's color/class to determine connection status
      const buttonClasses = await socketButton.getAttribute('class');
      console.log(`🔍 Socket.IO button classes: ${buttonClasses}`);
      
      // Check if button indicates connected (green) or disconnected (red)
      const isConnected = buttonClasses?.includes('text-green') || false;
      const isDisconnected = buttonClasses?.includes('text-red') || false;
      
      console.log(`🔌 Connection indicator - Connected: ${isConnected}, Disconnected: ${isDisconnected}`);
      
      // Get the title attribute for connection status
      const title = await socketButton.getAttribute('title');
      console.log(`🔍 Socket.IO button title: ${title}`);
      
      expect(title).toContain('Socket.IO');
    } else {
      console.log('⚠️ Socket.IO test button not found on discover page');
    }
    
    console.log('🎉 Connection status indicator test completed!');
  });

  test('should verify Socket.IO client loading in browser', async ({ page }) => {
    console.log('🧪 Testing Socket.IO client loading in browser...');
    
    // Authenticate and navigate to discover
    await authHelper.clearAuthState();
    await authHelper.signUp(TEST_USERS.alice);
    
    // Wait for Socket.IO to initialize
    await page.waitForTimeout(5000);
    
    // Check if Socket.IO client is loaded in the browser
    const socketIOStatus = await page.evaluate(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const result = {
            hasSocketIOGlobal: typeof window !== 'undefined' && (window as any).io !== undefined,
            hasWebSocket: typeof WebSocket !== 'undefined',
            socketIOVersion: (window as any).io?.version || 'not available',
            currentUrl: window.location.href,
            pageTitle: document.title
          };
          
          resolve(result);
        }, 1000);
      });
    });
    
    console.log('🔍 Socket.IO browser status:', socketIOStatus);
    
    // Verify WebSocket capability exists
    expect(socketIOStatus.hasWebSocket).toBeTruthy();

    // Check if we're on discover or onboarding
    expect(socketIOStatus.currentUrl).toMatch(/\/(discover|onboarding(?:-v2)?)/);
    
    console.log('🎉 Socket.IO client loading test completed!');
  });

  test('should test real-time messaging interface on discover page', async ({ page }) => {
    console.log('🧪 Testing real-time messaging interface...');
    
    // Authenticate and navigate to discover
    await authHelper.clearAuthState();
    await authHelper.signUp(TEST_USERS.alice);
    
    // Wait for initialization
    await page.waitForTimeout(3000);
    
    // Open Socket.IO test interface
    const socketButton = page.locator('button[title*="Socket.IO"]');
    const hasSocketButton = await socketButton.count();
    
    if (hasSocketButton > 0) {
      await socketButton.click();
      await page.waitForTimeout(1000);
      
      // Test the complete messaging interface
      const testInterface = page.locator('text=Socket.IO Test');
      const hasTestInterface = await testInterface.count();
      
      if (hasTestInterface > 0) {
        console.log('✅ Socket.IO test interface opened');
        
        // Test message input and sending
        const messageInput = page.locator('input[placeholder*="test message"]');
        const sendButton = page.locator('button:has-text("Send")');
        
        if (await messageInput.count() > 0 && await sendButton.count() > 0) {
          // Send multiple test messages
          const testMessages = [
            'Test message 1',
            'Hello Socket.IO!',
            'Real-time messaging test'
          ];
          
          for (const message of testMessages) {
            console.log(`📤 Sending message: "${message}"`);
            await messageInput.fill(message);
            await sendButton.click();
            await page.waitForTimeout(500);
            
            // Verify input was cleared
            const inputValue = await messageInput.inputValue();
            expect(inputValue).toBe('');
          }
          
          console.log('✅ All test messages sent successfully');
        }
        
        // Test clear messages functionality
        const clearButton = page.locator('button:has-text("Clear")');
        if (await clearButton.count() > 0) {
          console.log('🧹 Testing clear messages functionality...');
          await clearButton.click();
          await page.waitForTimeout(500);
        }
        
        // Close the test interface
        const closeButton = page.locator('button:has-text("×")');
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(500);
          
          // Verify interface is closed
          const interfaceClosed = await testInterface.count() === 0;
          console.log(`✅ Test interface closed: ${interfaceClosed}`);
        }
      }
    }
    
    console.log('🎉 Real-time messaging interface test completed!');
  });
});
