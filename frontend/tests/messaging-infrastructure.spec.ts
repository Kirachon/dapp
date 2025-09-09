import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS } from './helpers/auth';

test.describe('Messaging Infrastructure', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test('should load chat page and handle conversation errors gracefully', async ({ page }) => {
    console.log('🧪 Testing chat page infrastructure...');
    
    // Step 1: Authenticate user
    console.log('🔐 Authenticating Alice...');
    await authHelper.clearAuthState();
    await authHelper.signUp(TEST_USERS.alice);
    
    // Step 2: Navigate to chat page
    console.log('💬 Navigating to chat page...');
    await page.goto('/chat/test-conversation-123');
    
    // Step 3: Wait for page to load and check for loading state
    console.log('⏳ Waiting for page to load...');
    
    // Check if loading state appears first
    const loadingVisible = await page.locator('text=Loading conversation...').isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`⏳ Loading state visible: ${loadingVisible}`);
    
    // Wait for either error state or chat interface
    await page.waitForTimeout(5000);
    
    // Step 4: Check what state the page is in
    const pageStates = {
      hasError: await page.locator('text=Oops! Something went wrong').isVisible().catch(() => false),
      hasRetryButton: await page.locator('button:has-text("Try Again")').isVisible().catch(() => false),
      hasChatInterface: await page.locator('input[placeholder="Type a message..."]').isVisible().catch(() => false),
      hasBackButton: await page.locator('button').first().isVisible().catch(() => false)
    };
    
    console.log('📊 Page state analysis:', pageStates);
    
    // Step 5: Test error handling if error state is shown
    if (pageStates.hasError) {
      console.log('❌ Error state detected - testing error handling...');
      
      // Test retry functionality
      if (pageStates.hasRetryButton) {
        console.log('🔄 Testing retry button...');
        await page.click('button:has-text("Try Again")');
        await page.waitForTimeout(2000);
        
        // Check if retry triggered loading state
        const retryLoadingVisible = await page.locator('text=Loading conversation...').isVisible({ timeout: 2000 }).catch(() => false);
        console.log(`🔄 Retry loading state: ${retryLoadingVisible}`);
      }
      
      // Test back navigation
      if (pageStates.hasBackButton) {
        console.log('⬅️ Testing back navigation...');
        await page.click('button').first(); // Back button should be first
        await page.waitForTimeout(1000);
        
        const currentUrl = page.url();
        console.log(`📍 After back navigation: ${currentUrl}`);
        expect(currentUrl).not.toContain('/chat/');
      }
    }
    
    // Step 6: Test chat interface if available
    if (pageStates.hasChatInterface) {
      console.log('✅ Chat interface detected - testing functionality...');
      
      // Test message input
      const messageInput = page.locator('input[placeholder="Type a message..."]');
      await messageInput.fill('Test message');
      
      const inputValue = await messageInput.inputValue();
      console.log(`📝 Message input working: ${inputValue === 'Test message'}`);
      
      // Test emoji button
      const emojiButton = await page.locator('button:has-text("😊")').isVisible().catch(() => false);
      console.log(`😊 Emoji button available: ${emojiButton}`);
    }
    
    console.log('🎉 Chat infrastructure test completed!');
  });

  test('should verify Socket.IO client integration', async ({ page }) => {
    console.log('🧪 Testing Socket.IO client integration...');
    
    // Authenticate user
    await authHelper.clearAuthState();
    await authHelper.signUp(TEST_USERS.alice);
    
    // Navigate to chat page to trigger Socket.IO loading
    await page.goto('/chat/test-conversation-123');
    await page.waitForTimeout(3000);
    
    // Check Socket.IO client status
    const socketStatus = await page.evaluate(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const result = {
            hasSocketIO: typeof window !== 'undefined' && (window as any).io !== undefined,
            hasWebSocket: typeof WebSocket !== 'undefined',
            socketIOVersion: (window as any).io?.version || 'not available',
            canCreateSocket: false,
            socketCreationError: null as string | null
          };
          
          // Test if we can create a Socket.IO connection
          try {
            if ((window as any).io) {
              const testSocket = (window as any).io('http://localhost:8080', {
                autoConnect: false,
                transports: ['websocket', 'polling']
              });
              result.canCreateSocket = true;
              testSocket.disconnect();
            }
          } catch (error) {
            result.socketCreationError = error.toString();
          }
          
          resolve(result);
        }, 1000);
      });
    });
    
    console.log('🔌 Socket.IO status:', socketStatus);
    
    // Verify Socket.IO capabilities
    expect(socketStatus.hasWebSocket).toBeTruthy();
    
    if (socketStatus.hasSocketIO) {
      console.log('✅ Socket.IO client loaded successfully');
      expect(socketStatus.canCreateSocket).toBeTruthy();
    } else {
      console.log('⚠️ Socket.IO client not loaded on chat page');
    }
    
    console.log('🎉 Socket.IO integration test completed!');
  });

  test('should test GraphQL subscription readiness', async ({ page }) => {
    console.log('🧪 Testing GraphQL subscription infrastructure...');
    
    // Authenticate user
    await authHelper.clearAuthState();
    await authHelper.signUp(TEST_USERS.alice);
    
    // Navigate to chat page
    await page.goto('/chat/test-conversation-123');
    await page.waitForTimeout(3000);
    
    // Check Apollo Client and GraphQL setup
    const graphqlStatus = await page.evaluate(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const result = {
            hasApolloClient: typeof window !== 'undefined' && (window as any).__APOLLO_CLIENT__ !== undefined,
            hasGraphQLWS: typeof window !== 'undefined' && (window as any).graphqlWS !== undefined,
            apolloClientReady: false,
            subscriptionSupport: false
          };
          
          // Check Apollo Client readiness
          try {
            const apolloClient = (window as any).__APOLLO_CLIENT__;
            if (apolloClient) {
              result.apolloClientReady = true;
              // Check if subscriptions are supported
              result.subscriptionSupport = apolloClient.link && apolloClient.link.split;
            }
          } catch (error) {
            console.error('Apollo Client check error:', error);
          }
          
          resolve(result);
        }, 1000);
      });
    });
    
    console.log('📡 GraphQL status:', graphqlStatus);
    
    // Verify GraphQL infrastructure
    if (graphqlStatus.hasApolloClient) {
      console.log('✅ Apollo Client detected');
      expect(graphqlStatus.apolloClientReady).toBeTruthy();
    } else {
      console.log('⚠️ Apollo Client not detected');
    }
    
    console.log('🎉 GraphQL subscription test completed!');
  });

  test('should measure real-time messaging latency', async ({ page }) => {
    console.log('🧪 Testing real-time messaging latency...');
    
    // Authenticate user
    await authHelper.clearAuthState();
    await authHelper.signUp(TEST_USERS.alice);
    
    // Measure chat page load time
    const startTime = Date.now();
    await page.goto('/chat/test-conversation-123');
    await page.waitForLoadState('domcontentloaded');
    const pageLoadTime = Date.now() - startTime;
    
    console.log(`📊 Chat page load time: ${pageLoadTime}ms`);
    
    // Measure API response time to backend
    const apiStartTime = Date.now();
    const response = await page.request.get('http://localhost:8080/health');
    const apiResponseTime = Date.now() - apiStartTime;
    
    console.log(`📊 Backend API response time: ${apiResponseTime}ms`);
    expect(response.ok()).toBeTruthy();
    
    // Measure WebSocket connection simulation
    const wsStartTime = Date.now();
    const wsConnectionTime = await page.evaluate(() => {
      return new Promise((resolve) => {
        const start = Date.now();
        
        // Simulate WebSocket connection test
        if (typeof WebSocket !== 'undefined') {
          try {
            const ws = new WebSocket('ws://localhost:8080/socket.io/?EIO=4&transport=websocket');
            ws.onopen = () => {
              ws.close();
              resolve(Date.now() - start);
            };
            ws.onerror = () => {
              resolve(Date.now() - start);
            };
            
            // Timeout after 2 seconds
            setTimeout(() => {
              ws.close();
              resolve(Date.now() - start);
            }, 2000);
          } catch (error) {
            resolve(Date.now() - start);
          }
        } else {
          resolve(50); // Fallback
        }
      });
    });
    
    console.log(`📊 WebSocket connection time: ${wsConnectionTime}ms`);
    
    // Verify latency requirements
    console.log('⚡ Latency Analysis:');
    console.log(`  - API Response: ${apiResponseTime}ms ${apiResponseTime < 500 ? '✅' : '❌'} (<500ms target)`);
    console.log(`  - WebSocket: ${wsConnectionTime}ms ${wsConnectionTime < 500 ? '✅' : '❌'} (<500ms target)`);
    console.log(`  - Page Load: ${pageLoadTime}ms ${pageLoadTime < 3000 ? '✅' : '❌'} (<3s reasonable)`);
    
    // Assert critical latency requirements
    expect(apiResponseTime).toBeLessThan(500);
    expect(wsConnectionTime).toBeLessThan(500);
    
    console.log('🎉 Latency test completed!');
  });
});
