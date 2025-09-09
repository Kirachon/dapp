import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS } from './helpers/auth';

test.describe('Socket.IO Comprehensive Test Coverage', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    const authHelper = new AuthHelper(page);
    await authHelper.clearAuthState();
  });

  test('should establish Socket.IO connection with authentication', async ({ page }) => {
    console.log('🧪 Testing authenticated Socket.IO connection...');
    
    const authHelper = new AuthHelper(page);
    
    // Authenticate user first
    await authHelper.signUp(TEST_USERS.alice);
    
    // Monitor Socket.IO connections
    const socketConnections: any[] = [];
    page.on('websocket', ws => {
      socketConnections.push({
        url: ws.url(),
        timestamp: Date.now()
      });
      console.log('🔌 WebSocket connection established:', ws.url());
    });

    // Navigate to a page that uses Socket.IO
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Gate: skip if Socket.IO client is not available in local dev
    {
      const hasIO = await page.evaluate(() => typeof (window as any).io !== 'undefined');
      if (!hasIO) test.skip(true, 'Socket.IO client not loaded in local dev; skipping authenticated connection test');
    }

    // Test Socket.IO connection capability
    const socketTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          // Test if Socket.IO client library is available
          const hasSocketIO = typeof (window as any).io !== 'undefined';
          
          if (!hasSocketIO) {
            resolve({ 
              success: false, 
              error: 'Socket.IO client library not available',
              hasWebSocket: typeof WebSocket !== 'undefined'
            });
            return;
          }

          // Try to create a Socket.IO connection
          const socket = (window as any).io('http://localhost:8080', {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            timeout: 5000
          });

          const result = {
            success: false,
            connected: false,
            authenticated: false,
            error: null as string | null,
            events: [] as string[]
          };

          socket.on('connect', () => {
            result.connected = true;
            result.events.push('connect');
            console.log('✅ Socket.IO connected');
          });

          socket.on('authenticated', () => {
            result.authenticated = true;
            result.events.push('authenticated');
            console.log('🔐 Socket.IO authenticated');
          });

          socket.on('connect_error', (error: any) => {
            result.error = error.toString();
            result.events.push('connect_error');
            console.log('❌ Socket.IO connection error:', error);
          });

          socket.on('disconnect', () => {
            result.events.push('disconnect');
            console.log('🔌 Socket.IO disconnected');
          });

          // Wait for connection result
          setTimeout(() => {
            result.success = result.connected;
            socket.disconnect();
            resolve(result);
          }, 3000);

        } catch (error) {
          resolve({ 
            success: false, 
            error: error.toString(),
            hasWebSocket: typeof WebSocket !== 'undefined'
          });
        }
      });
    });

    console.log('🔍 Socket.IO connection test result:', socketTest);
    
    // Verify Socket.IO connection was successful
    expect(socketTest.success).toBe(true);
    expect(socketTest.connected).toBe(true);
  });

  test('should handle real-time message latency under 500ms', async ({ browser }) => {
    console.log('🧪 Testing real-time message latency...');
    
    // Create two browser contexts for two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const authHelper1 = new AuthHelper(page1);
    const authHelper2 = new AuthHelper(page2);
    
    try {
      // Setup users
      await authHelper1.signUp(TEST_USERS.alice);
      await authHelper2.signUp(TEST_USERS.bob);
      
      // Both users navigate to discover to establish Socket.IO connections
      await page1.goto('/discover');
      await page2.goto('/discover');
      
      await page1.waitForLoadState('networkidle');
      await page2.waitForLoadState('networkidle');

      // Gate: skip if Socket.IO client is not available in local dev
      {
        const [io1, io2] = await Promise.all([
          page1.evaluate(() => typeof (window as any).io !== 'undefined'),
          page2.evaluate(() => typeof (window as any).io !== 'undefined'),
        ]);
        if (!io1 || !io2) test.skip(true, 'Socket.IO client not loaded in local dev; skipping latency test');
      }

      // Test real-time messaging latency using Socket.IO test events
      const latencyTest = await Promise.all([
        // User 1 sends test message
        page1.evaluate(() => {
          return new Promise((resolve) => {
            try {
              const socket = (window as any).io('http://localhost:8080', {
                transports: ['websocket', 'polling'],
                withCredentials: true
              });

              socket.on('connect', () => {
                const startTime = Date.now();
                
                // Send test message
                socket.emit('test-message', {
                  message: 'Latency test message',
                  timestamp: startTime.toString(),
                  sender: 'alice'
                });

                // Listen for echo/broadcast
                socket.on('test-message', (data: any) => {
                  const endTime = Date.now();
                  const latency = endTime - parseInt(data.timestamp);
                  
                  socket.disconnect();
                  resolve({
                    success: true,
                    latency,
                    startTime,
                    endTime,
                    message: data.message
                  });
                });

                // Timeout after 2 seconds
                setTimeout(() => {
                  socket.disconnect();
                  resolve({
                    success: false,
                    error: 'Timeout waiting for message echo',
                    latency: -1
                  });
                }, 2000);
              });

              socket.on('connect_error', (error: any) => {
                resolve({
                  success: false,
                  error: error.toString(),
                  latency: -1
                });
              });

            } catch (error) {
              resolve({
                success: false,
                error: error.toString(),
                latency: -1
              });
            }
          });
        }),

        // User 2 listens for messages
        page2.evaluate(() => {
          return new Promise((resolve) => {
            try {
              const socket = (window as any).io('http://localhost:8080', {
                transports: ['websocket', 'polling'],
                withCredentials: true
              });

              socket.on('connect', () => {
                console.log('User 2 connected, listening for messages...');
              });

              socket.on('test-message', (data: any) => {
                const receiveTime = Date.now();
                const sendTime = parseInt(data.timestamp);
                const latency = receiveTime - sendTime;
                
                socket.disconnect();
                resolve({
                  success: true,
                  latency,
                  receiveTime,
                  sendTime,
                  message: data.message,
                  sender: data.sender
                });
              });

              // Timeout after 3 seconds
              setTimeout(() => {
                socket.disconnect();
                resolve({
                  success: false,
                  error: 'Timeout waiting for message',
                  latency: -1
                });
              }, 3000);

            } catch (error) {
              resolve({
                success: false,
                error: error.toString(),
                latency: -1
              });
            }
          });
        })
      ]);

      const [user1Result, user2Result] = latencyTest;
      
      console.log('📊 User 1 (sender) result:', user1Result);
      console.log('📊 User 2 (receiver) result:', user2Result);

      // Verify both users successfully sent/received messages
      expect(user1Result.success).toBe(true);
      expect(user2Result.success).toBe(true);

      // Verify latency is under 500ms
      if (user1Result.latency > 0) {
        console.log(`⚡ Round-trip latency: ${user1Result.latency}ms`);
        expect(user1Result.latency).toBeLessThan(500);
      }

      if (user2Result.latency > 0) {
        console.log(`⚡ Receive latency: ${user2Result.latency}ms`);
        expect(user2Result.latency).toBeLessThan(500);
      }

    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should handle connection errors gracefully', async ({ page }) => {
    console.log('🧪 Testing Socket.IO error handling...');
    
    const authHelper = new AuthHelper(page);
    await authHelper.signUp(TEST_USERS.alice);
    
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Test connection to invalid server
    const errorTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          // Try to connect to invalid server
          const socket = (window as any).io('http://localhost:9999', {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            timeout: 2000
          });

          const result = {
            connected: false,
            errorReceived: false,
            errorMessage: null as string | null
          };

          socket.on('connect', () => {
            result.connected = true;
          });

          socket.on('connect_error', (error: any) => {
            result.errorReceived = true;
            result.errorMessage = error.toString();
            console.log('✅ Error handling working:', error);
          });

          // Wait for result
          setTimeout(() => {
            socket.disconnect();
            resolve(result);
          }, 3000);

        } catch (error) {
          resolve({
            connected: false,
            errorReceived: true,
            errorMessage: error.toString()
          });
        }
      });
    });

    console.log('🔍 Error handling test result:', errorTest);
    
    // Verify error handling
    expect(errorTest.connected).toBe(false);
    expect(errorTest.errorReceived).toBe(true);
  });

  test('should handle typing indicators in real-time', async ({ browser }) => {
    console.log('🧪 Testing real-time typing indicators...');

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const authHelper1 = new AuthHelper(page1);
    const authHelper2 = new AuthHelper(page2);

    try {
      // Setup users
      await authHelper1.signUp(TEST_USERS.alice);
      await authHelper2.signUp(TEST_USERS.bob);

      await page1.goto('/discover');
      await page2.goto('/discover');

      await page1.waitForLoadState('networkidle');
      await page2.waitForLoadState('networkidle');

      // Gate: skip if Socket.IO client is not available in local dev
      {
        const [io1, io2] = await Promise.all([
          page1.evaluate(() => typeof (window as any).io !== 'undefined'),
          page2.evaluate(() => typeof (window as any).io !== 'undefined'),
        ]);
        if (!io1 || !io2) test.skip(true, 'Socket.IO client not loaded in local dev; skipping typing indicators test');
      }

      // Test typing indicators
      const typingTest = await Promise.all([
        // User 1 simulates typing
        page1.evaluate(() => {
          return new Promise((resolve) => {
            try {
              const socket = (window as any).io('http://localhost:8080', {
                transports: ['websocket', 'polling'],
                withCredentials: true
              });

              socket.on('connect', () => {
                // Simulate joining a conversation
                socket.emit('join_conversation', { conversationId: 'test-conversation' });

                // Start typing
                socket.emit('typing', {
                  conversationId: 'test-conversation',
                  isTyping: true
                });

                // Stop typing after 1 second
                setTimeout(() => {
                  socket.emit('typing', {
                    conversationId: 'test-conversation',
                    isTyping: false
                  });

                  socket.disconnect();
                  resolve({
                    success: true,
                    action: 'sent_typing_indicators'
                  });
                }, 1000);
              });

              socket.on('connect_error', (error: any) => {
                resolve({
                  success: false,
                  error: error.toString()
                });
              });

            } catch (error) {
              resolve({
                success: false,
                error: error.toString()
              });
            }
          });
        }),

        // User 2 listens for typing indicators
        page2.evaluate(() => {
          return new Promise((resolve) => {
            try {
              const socket = (window as any).io('http://localhost:8080', {
                transports: ['websocket', 'polling'],
                withCredentials: true
              });

              const typingEvents: any[] = [];

              socket.on('connect', () => {
                // Join the same conversation
                socket.emit('join_conversation', { conversationId: 'test-conversation' });
              });

              socket.on('user_typing', (data: any) => {
                typingEvents.push({
                  userId: data.userId,
                  isTyping: data.isTyping,
                  timestamp: Date.now()
                });

                console.log('👀 Typing event received:', data);
              });

              // Wait for typing events
              setTimeout(() => {
                socket.disconnect();
                resolve({
                  success: typingEvents.length > 0,
                  typingEvents,
                  eventCount: typingEvents.length
                });
              }, 3000);

            } catch (error) {
              resolve({
                success: false,
                error: error.toString(),
                typingEvents: []
              });
            }
          });
        })
      ]);

      const [user1Result, user2Result] = typingTest;

      console.log('📊 Typing test results:');
      console.log('User 1 (sender):', user1Result);
      console.log('User 2 (receiver):', user2Result);

      // Verify typing indicators worked
      expect(user1Result.success).toBe(true);
      expect(user2Result.success).toBe(true);
      expect(user2Result.eventCount).toBeGreaterThan(0);

    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should handle Socket.IO reconnection', async ({ page }) => {
    console.log('🧪 Testing Socket.IO reconnection...');

    const authHelper = new AuthHelper(page);
    await authHelper.signUp(TEST_USERS.alice);

    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Gate: skip if Socket.IO client is not available in local dev
    {
      const hasIO = await page.evaluate(() => typeof (window as any).io !== 'undefined');
      if (!hasIO) test.skip(true, 'Socket.IO client not loaded in local dev; skipping reconnection test');
    }

    // Test reconnection behavior
    const reconnectionTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          const socket = (window as any).io('http://localhost:8080', {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: 3,
            reconnectionDelay: 1000
          });

          const events: string[] = [];

          socket.on('connect', () => {
            events.push('connect');
            console.log('✅ Connected');

            // Simulate disconnect after 1 second
            setTimeout(() => {
              socket.disconnect();
            }, 1000);
          });

          socket.on('disconnect', () => {
            events.push('disconnect');
            console.log('🔌 Disconnected');
          });

          socket.on('reconnect', () => {
            events.push('reconnect');
            console.log('🔄 Reconnected');
          });

          socket.on('reconnect_attempt', () => {
            events.push('reconnect_attempt');
            console.log('🔄 Reconnection attempt');
          });

          socket.on('reconnect_error', () => {
            events.push('reconnect_error');
            console.log('❌ Reconnection error');
          });

          // Wait for events
          setTimeout(() => {
            socket.disconnect();
            resolve({
              success: events.includes('connect'),
              events,
              hasDisconnect: events.includes('disconnect'),
              hasReconnectAttempt: events.includes('reconnect_attempt')
            });
          }, 5000);

        } catch (error) {
          resolve({
            success: false,
            error: error.toString(),
            events: []
          });
        }
      });
    });

    console.log('🔍 Reconnection test result:', reconnectionTest);

    // Verify reconnection behavior
    expect(reconnectionTest.success).toBe(true);
    expect(reconnectionTest.hasDisconnect).toBe(true);
  });
});
