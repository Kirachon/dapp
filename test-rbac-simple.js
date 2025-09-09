// Simple RBAC test using fetch
async function testRBAC() {
  console.log('🔐 Testing RBAC Implementation...\n');

  try {
    // Test 1: Test GraphQL me query without authentication
    console.log('📋 Test 1: Unauthenticated GraphQL access');
    const unauthResponse = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

    const unauthData = await unauthResponse.json();
    if (unauthData.data?.me === null) {
      console.log('✅ Unauthenticated user correctly returns null for me query');
    } else {
      console.log('❌ Unauthenticated user should return null');
      console.log('Response:', JSON.stringify(unauthData, null, 2));
    }

    // Test 2: Test admin login via GraphQL
    console.log('\n📋 Test 2: Admin login via GraphQL');
    const loginResponse = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation {
            signIn(email: "admin@loveconnect.com", password: "admin123") {
              ok
              error
              user {
                id
                email
                roles
              }
            }
          }
        `
      })
    });

    const loginData = await loginResponse.json();
    if (loginData.data?.signIn?.ok) {
      console.log('✅ Admin login successful');
      console.log('Admin user roles:', loginData.data.signIn.user.roles);
      
      // Check if admin role is present
      if (loginData.data.signIn.user.roles.includes('admin')) {
        console.log('✅ Admin role correctly assigned');
      } else {
        console.log('❌ Admin role not found in user roles');
      }
    } else {
      console.log('❌ Admin login failed');
      console.log('Error:', loginData.data?.signIn?.error);
    }

    console.log('\n🎉 RBAC GraphQL testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRBAC();
