const { chromium } = require('playwright');

async function testRBAC() {
  console.log('🔐 Testing RBAC Implementation...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Test 1: Unauthenticated user should be redirected from admin routes
    console.log('📋 Test 1: Unauthenticated access to admin routes');
    await page.goto('http://localhost:3000/admin');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/signin') || currentUrl === 'http://localhost:3000/') {
      console.log('✅ Unauthenticated user correctly redirected from /admin');
    } else {
      console.log('❌ Unauthenticated user not redirected from /admin');
    }

    // Test 2: Admin login and access
    console.log('\n📋 Test 2: Admin user login and access');
    await page.goto('http://localhost:3000/admin/login');
    await page.waitForTimeout(1000);
    
    // Fill admin login form
    await page.fill('input[type="email"]', 'admin@loveconnect.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for potential redirect
    await page.waitForTimeout(3000);
    
    const adminUrl = page.url();
    if (adminUrl.includes('/admin') && !adminUrl.includes('/login')) {
      console.log('✅ Admin user successfully logged in and accessed admin area');
    } else {
      console.log('❌ Admin user login failed or access denied');
      console.log('Current URL:', adminUrl);
    }

    // Test 3: Admin routes accessibility
    console.log('\n📋 Test 3: Admin routes accessibility');
    const adminRoutes = ['/admin', '/admin/users', '/admin/moderation'];
    
    for (const route of adminRoutes) {
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForTimeout(1500);
      
      const routeUrl = page.url();
      if (routeUrl.includes(route)) {
        console.log(`✅ Admin can access ${route}`);
      } else {
        console.log(`❌ Admin cannot access ${route} (redirected to ${routeUrl})`);
      }
    }

    // Test 4: Check GraphQL resolver permissions
    console.log('\n📋 Test 4: GraphQL resolver permissions');
    try {
      const response = await page.evaluate(async () => {
        const response = await fetch('http://localhost:8080/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            query: `
              query {
                me {
                  id
                  email
                  roles
                }
              }
            `
          })
        });
        return response.json();
      });

      if (response.data?.me?.roles?.includes('admin')) {
        console.log('✅ GraphQL correctly returns admin role for admin user');
      } else {
        console.log('❌ GraphQL does not return admin role');
        console.log('Response:', JSON.stringify(response, null, 2));
      }
    } catch (error) {
      console.log('❌ GraphQL query failed:', error.message);
    }

    console.log('\n🎉 RBAC testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testRBAC().catch(console.error);
