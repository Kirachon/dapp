import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS } from './helpers/auth';

test.describe('Discover Page Console Debug', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test('should capture all console messages and errors on discover page', async ({ page }) => {
    console.log('🧪 Debugging discover page console messages...');
    
    // Capture all console messages
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      
      consoleMessages.push(`[${type}] ${text}`);
      
      if (type === 'error') {
        consoleErrors.push(text);
        console.log(`❌ Console Error: ${text}`);
      } else if (text.includes('Socket.IO') || text.includes('socket') || text.includes('io')) {
        console.log(`🔍 Socket.IO related: [${type}] ${text}`);
      } else {
        console.log(`📝 Console: [${type}] ${text}`);
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      console.log(`💥 Page Error: ${error.message}`);
      consoleErrors.push(`Page Error: ${error.message}`);
    });
    
    // Authenticate and navigate to discover
    console.log('🔐 Authenticating Alice...');
    await authHelper.clearAuthState();
    await authHelper.signUp(TEST_USERS.alice);
    
    // Wait for page to fully load and Socket.IO to initialize
    console.log('⏳ Waiting for page to fully load...');
    await page.waitForTimeout(10000); // Wait longer to see all initialization
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Try to manually trigger Socket.IO initialization by evaluating code
    console.log('🔌 Manually checking Socket.IO status...');
    
    const manualSocketCheck = await page.evaluate(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const result = {
            hasSocketIOImport: typeof window !== 'undefined' && (window as any).io !== undefined,
            hasWebSocket: typeof WebSocket !== 'undefined',
            windowKeys: typeof window !== 'undefined' ? Object.keys(window).filter(key => 
              key.toLowerCase().includes('socket') || key.toLowerCase().includes('io')
            ) : [],
            errors: [] as string[]
          };
          
          // Try to manually import Socket.IO
          try {
            if (typeof window !== 'undefined') {
              // Check if Socket.IO is available in any form
              const socketIOCheck = (window as any).io;
              result.hasSocketIOImport = socketIOCheck !== undefined;
              
              if (!socketIOCheck) {
                result.errors.push('Socket.IO not found in window object');
              }
            }
          } catch (error) {
            result.errors.push(`Socket.IO check error: ${error}`);
          }
          
          resolve(result);
        }, 2000);
      });
    });
    
    console.log('🔍 Manual Socket.IO check result:', manualSocketCheck);
    
    // Check if the Socket.IO button exists in the DOM
    const socketButton = page.locator('button[title*="Socket.IO"]');
    const socketButtonCount = await socketButton.count();
    console.log(`🔍 Socket.IO button count: ${socketButtonCount}`);
    
    if (socketButtonCount > 0) {
      const buttonTitle = await socketButton.getAttribute('title');
      const buttonClasses = await socketButton.getAttribute('class');
      console.log(`🔍 Socket.IO button title: ${buttonTitle}`);
      console.log(`🔍 Socket.IO button classes: ${buttonClasses}`);
    }
    
    // Check for any React error boundaries or component errors
    const errorBoundaries = await page.locator('[data-testid*="error"], .error-boundary, [class*="error"]').count();
    console.log(`🔍 Error boundaries found: ${errorBoundaries}`);
    
    // Summary
    console.log('\n📊 Debug Summary:');
    console.log(`   Total console messages: ${consoleMessages.length}`);
    console.log(`   Console errors: ${consoleErrors.length}`);
    console.log(`   Socket.IO available: ${manualSocketCheck.hasSocketIOImport}`);
    console.log(`   WebSocket available: ${manualSocketCheck.hasWebSocket}`);
    console.log(`   Socket.IO button found: ${socketButtonCount > 0}`);
    
    if (consoleErrors.length > 0) {
      console.log('\n❌ Console Errors:');
      consoleErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (manualSocketCheck.errors.length > 0) {
      console.log('\n🔍 Socket.IO Check Errors:');
      manualSocketCheck.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    console.log('🎉 Console debug completed!');
  });

  test('should test Socket.IO import and initialization step by step', async ({ page }) => {
    console.log('🧪 Testing Socket.IO import and initialization step by step...');
    
    // Authenticate and navigate to discover
    await authHelper.clearAuthState();
    await authHelper.signUp(TEST_USERS.alice);
    
    // Step 1: Check if Socket.IO module is imported
    console.log('📦 Step 1: Checking Socket.IO module import...');
    
    const step1Result = await page.evaluate(() => {
      return {
        hasSocketIOGlobal: typeof window !== 'undefined' && (window as any).io !== undefined,
        hasSocketIOConstructor: typeof window !== 'undefined' && typeof (window as any).io === 'function',
        socketIOType: typeof window !== 'undefined' ? typeof (window as any).io : 'undefined'
      };
    });
    
    console.log('🔍 Step 1 Result:', step1Result);
    
    // Step 2: Try to manually create a Socket.IO connection
    console.log('🔌 Step 2: Attempting manual Socket.IO connection...');
    
    const step2Result = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          if (typeof window !== 'undefined' && (window as any).io) {
            const socket = (window as any).io('http://localhost:8080', {
              autoConnect: false,
              transports: ['websocket', 'polling']
            });
            
            resolve({
              success: true,
              socketCreated: socket !== undefined,
              socketType: typeof socket,
              error: null
            });
          } else {
            resolve({
              success: false,
              socketCreated: false,
              socketType: 'undefined',
              error: 'Socket.IO not available'
            });
          }
        } catch (error) {
          resolve({
            success: false,
            socketCreated: false,
            socketType: 'error',
            error: error.toString()
          });
        }
      });
    });
    
    console.log('🔍 Step 2 Result:', step2Result);
    
    // Step 3: Check React component state
    console.log('⚛️ Step 3: Checking React component state...');
    
    const step3Result = await page.evaluate(() => {
      // Try to find React component instances or state
      const reactElements = document.querySelectorAll('[data-reactroot], [data-react-helmet]');
      
      return {
        reactElementsFound: reactElements.length,
        hasReactRoot: document.querySelector('[data-reactroot]') !== null,
        bodyClasses: document.body.className,
        htmlClasses: document.documentElement.className
      };
    });
    
    console.log('🔍 Step 3 Result:', step3Result);
    
    // Step 4: Check network requests
    console.log('🌐 Step 4: Checking network requests...');
    
    // Wait a bit more and check for any network activity
    await page.waitForTimeout(3000);
    
    const networkRequests = await page.evaluate(() => {
      // Check if there are any pending network requests or WebSocket connections
      return {
        currentUrl: window.location.href,
        userAgent: navigator.userAgent,
        onlineStatus: navigator.onLine
      };
    });
    
    console.log('🔍 Step 4 Result:', networkRequests);
    
    console.log('🎉 Step-by-step Socket.IO test completed!');
  });
});
