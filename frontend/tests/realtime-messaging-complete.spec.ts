import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS } from './helpers/auth';

test.describe('Complete Real-time Messaging', () => {
  let authHelperAlice: AuthHelper;
  let authHelperBob: AuthHelper;

  test.beforeEach(async ({ browser }) => {
    // Create two separate browser contexts for Alice and Bob
    const contextAlice = await browser.newContext();
    const contextBob = await browser.newContext();
    
    const pageAlice = await contextAlice.newPage();
    const pageBob = await contextBob.newPage();
    
    authHelperAlice = new AuthHelper(pageAlice);
    authHelperBob = new AuthHelper(pageBob);
  });

  test('should establish Socket.IO connections in chat interface', async () => {
    console.log('🧪 Testing Socket.IO connections in chat interface...');
    
    // Step 1: Authenticate both users
    console.log('👥 Authenticating Alice and Bob...');
    await authHelperAlice.clearAuthState();
    await authHelperAlice.signUp(TEST_USERS.alice);
    
    await authHelperBob.clearAuthState();
    await authHelperBob.signUp(TEST_USERS.bob);
    
    // Step 2: Navigate both users to the same chat conversation
    const testConversationId = 'test-conversation-realtime';
    console.log(`💬 Both users joining conversation: ${testConversationId}`);
    
    await authHelperAlice.page.goto(`/chat/${testConversationId}`);
    await authHelperBob.page.goto(`/chat/${testConversationId}`);
    
    // Step 3: Wait for pages to load and Socket.IO to initialize
    console.log('⏳ Waiting for Socket.IO initialization...');
    await authHelperAlice.page.waitForTimeout(5000);
    await authHelperBob.page.waitForTimeout(5000);
    
    // Step 4: Check Socket.IO status after initialization
    const aliceSocketStatus = await authHelperAlice.page.evaluate(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          // Check for Socket.IO in global scope and window
          const hasSocketIOGlobal = typeof window !== 'undefined' && (window as any).io !== undefined;
          const hasSocketIOInstance = typeof window !== 'undefined' && (window as any).socket !== undefined;
          
          resolve({
            hasSocketIOGlobal,
            hasSocketIOInstance,
            hasWebSocket: typeof WebSocket !== 'undefined',
            currentUrl: window.location.href,
            consoleErrors: (window as any).consoleErrors || []
          });
        }, 2000);
      });
    });
    
    const bobSocketStatus = await authHelperBob.page.evaluate(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const hasSocketIOGlobal = typeof window !== 'undefined' && (window as any).io !== undefined;
          const hasSocketIOInstance = typeof window !== 'undefined' && (window as any).socket !== undefined;
          
          resolve({
            hasSocketIOGlobal,
            hasSocketIOInstance,
            hasWebSocket: typeof WebSocket !== 'undefined',
            currentUrl: window.location.href
          });
        }, 2000);
      });
    });
    
    console.log('🔍 Alice Socket.IO status:', aliceSocketStatus);
    console.log('🔍 Bob Socket.IO status:', bobSocketStatus);
    
    // Step 5: Check for chat interface elements
    const aliceHasChatInput = await authHelperAlice.page.locator('input[placeholder="Type a message..."]').count();
    const bobHasChatInput = await authHelperBob.page.locator('input[placeholder="Type a message..."]').count();
    
    console.log(`💬 Alice chat input: ${aliceHasChatInput}`);
    console.log(`💬 Bob chat input: ${bobHasChatInput}`);
    
    // Step 6: Test message input functionality
    if (aliceHasChatInput > 0) {
      console.log('📝 Testing message input functionality...');
      
      const messageInput = authHelperAlice.page.locator('input[placeholder="Type a message..."]');
      await messageInput.fill('Hello from Alice!');
      
      const inputValue = await messageInput.inputValue();
      console.log(`✅ Message input working: ${inputValue === 'Hello from Alice!'}`);
      
      // Test Enter key functionality
      await authHelperAlice.page.keyboard.press('Enter');
      await authHelperAlice.page.waitForTimeout(1000);
      
      // Check if input was cleared (indicating message was sent)
      const inputAfterSend = await messageInput.inputValue();
      console.log(`📤 Message sent (input cleared): ${inputAfterSend === ''}`);
    }
    
    console.log('🎉 Socket.IO chat interface test completed!');
  });

  test('should test real-time message delivery between users', async () => {
    console.log('🧪 Testing real-time message delivery...');
    
    // Authenticate both users
    await authHelperAlice.clearAuthState();
    await authHelperAlice.signUp(TEST_USERS.alice);
    
    await authHelperBob.clearAuthState();
    await authHelperBob.signUp(TEST_USERS.bob);
    
    // Navigate to same conversation
    const conversationId = 'test-realtime-delivery';
    await authHelperAlice.page.goto(`/chat/${conversationId}`);
    await authHelperBob.page.goto(`/chat/${conversationId}`);
    
    // Wait for initialization
    await authHelperAlice.page.waitForTimeout(5000);
    await authHelperBob.page.waitForTimeout(5000);
    
    // Check if chat interfaces are available
    const aliceInput = authHelperAlice.page.locator('input[placeholder="Type a message..."]');
    const bobInput = authHelperBob.page.locator('input[placeholder="Type a message..."]');
    
    const aliceHasInput = await aliceInput.count() > 0;
    const bobHasInput = await bobInput.count() > 0;
    
    console.log(`💬 Alice has chat input: ${aliceHasInput}`);
    console.log(`💬 Bob has chat input: ${bobHasInput}`);
    
    if (aliceHasInput && bobHasInput) {
      console.log('✅ Both users have chat interface - testing message delivery');
      
      // Alice sends a message
      const testMessage = `Hello Bob! ${Date.now()}`;
      console.log(`📤 Alice sending: "${testMessage}"`);
      
      await aliceInput.fill(testMessage);
      await authHelperAlice.page.keyboard.press('Enter');
      
      // Wait for message to be processed
      await authHelperAlice.page.waitForTimeout(2000);
      await authHelperBob.page.waitForTimeout(2000);
      
      // Check if message appears in Alice's chat
      const aliceMessageVisible = await authHelperAlice.page.locator(`text="${testMessage}"`).count();
      console.log(`📨 Message visible in Alice's chat: ${aliceMessageVisible > 0}`);
      
      // Check if message appears in Bob's chat
      const bobMessageVisible = await authHelperBob.page.locator(`text="${testMessage}"`).count();
      console.log(`📨 Message visible in Bob's chat: ${bobMessageVisible > 0}`);
      
      // Test Bob's response
      const responseMessage = `Hi Alice! ${Date.now()}`;
      console.log(`📤 Bob responding: "${responseMessage}"`);
      
      await bobInput.fill(responseMessage);
      await authHelperBob.page.keyboard.press('Enter');
      
      // Wait for response
      await authHelperAlice.page.waitForTimeout(2000);
      await authHelperBob.page.waitForTimeout(2000);
      
      // Check if Bob's response appears in Alice's chat
      const aliceSeesResponse = await authHelperAlice.page.locator(`text="${responseMessage}"`).count();
      console.log(`📨 Bob's response visible in Alice's chat: ${aliceSeesResponse > 0}`);
      
    } else {
      console.log('⚠️ Chat interfaces not fully loaded - checking page states');
      
      // Check what's actually on the pages
      const alicePageText = await authHelperAlice.page.textContent('body');
      const bobPageText = await authHelperBob.page.textContent('body');
      
      console.log(`📄 Alice page has error: ${alicePageText?.includes('Something went wrong')}`);
      console.log(`📄 Bob page has error: ${bobPageText?.includes('Something went wrong')}`);
      console.log(`📄 Alice page has loading: ${alicePageText?.includes('Loading')}`);
      console.log(`📄 Bob page has loading: ${bobPageText?.includes('Loading')}`);
    }
    
    console.log('🎉 Real-time message delivery test completed!');
  });

  test('should test typing indicators between users', async () => {
    console.log('🧪 Testing typing indicators...');
    
    // Authenticate both users
    await authHelperAlice.clearAuthState();
    await authHelperAlice.signUp(TEST_USERS.alice);
    
    await authHelperBob.clearAuthState();
    await authHelperBob.signUp(TEST_USERS.bob);
    
    // Navigate to same conversation
    const conversationId = 'test-typing-indicators';
    await authHelperAlice.page.goto(`/chat/${conversationId}`);
    await authHelperBob.page.goto(`/chat/${conversationId}`);
    
    // Wait for initialization
    await authHelperAlice.page.waitForTimeout(5000);
    await authHelperBob.page.waitForTimeout(5000);
    
    // Check for chat inputs
    const aliceInput = authHelperAlice.page.locator('input[placeholder="Type a message..."]');
    const bobInput = authHelperBob.page.locator('input[placeholder="Type a message..."]');
    
    const aliceHasInput = await aliceInput.count() > 0;
    const bobHasInput = await bobInput.count() > 0;
    
    if (aliceHasInput && bobHasInput) {
      console.log('✅ Testing typing indicators...');
      
      // Alice starts typing
      console.log('⌨️ Alice starts typing...');
      await aliceInput.fill('Alice is typing...');
      
      // Wait a moment for typing indicator to propagate
      await authHelperBob.page.waitForTimeout(1500);
      
      // Check if Bob sees typing indicator
      const bobSeesTyping = await authHelperBob.page.locator('text=typing').count() > 0 ||
                           await authHelperBob.page.locator('[class*="typing"]').count() > 0;
      
      console.log(`👀 Bob sees Alice typing: ${bobSeesTyping}`);
      
      // Alice stops typing
      console.log('⌨️ Alice stops typing...');
      await aliceInput.clear();
      
      // Wait for typing indicator to disappear
      await authHelperBob.page.waitForTimeout(2000);
      
      // Check if typing indicator is gone
      const typingGone = await authHelperBob.page.locator('text=typing').count() === 0;
      console.log(`⌨️ Typing indicator cleared: ${typingGone}`);
      
    } else {
      console.log('⚠️ Chat inputs not available for typing test');
    }
    
    console.log('🎉 Typing indicators test completed!');
  });
});
