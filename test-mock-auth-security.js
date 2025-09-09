#!/usr/bin/env node

/**
 * Test script to verify mock authentication security
 * Tests that mock auth endpoints are properly disabled in production
 */

const fetch = require('node-fetch');

async function testMockAuthSecurity() {
  console.log('🔐 Testing Mock Authentication Security...\n');

  const baseUrl = 'http://localhost:8080';
  const mockEndpoints = [
    '/auth/signup',
    '/auth/signin', 
    '/auth/session/refresh',
    '/auth/signout'
  ];

  // Test 1: Development mode (should work)
  console.log('📋 Test 1: Development mode (NODE_ENV=development, ALLOW_MOCK_AUTH=false)');
  process.env.NODE_ENV = 'development';
  process.env.ALLOW_MOCK_AUTH = 'false';
  
  for (const endpoint of mockEndpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formFields: [
            { id: 'email', value: 'test@example.com' },
            { id: 'password', value: 'testpass123' }
          ]
        })
      });
      
      if (response.status === 503) {
        console.log(`❌ ${endpoint}: Unexpected 503 in development mode`);
      } else {
        console.log(`✅ ${endpoint}: Available in development (status: ${response.status})`);
      }
    } catch (error) {
      console.log(`⚠️  ${endpoint}: Connection error (server may not be running)`);
    }
  }

  console.log('\n📋 Test 2: Production mode (NODE_ENV=production, ALLOW_MOCK_AUTH=false)');
  process.env.NODE_ENV = 'production';
  process.env.ALLOW_MOCK_AUTH = 'false';
  
  for (const endpoint of mockEndpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formFields: [
            { id: 'email', value: 'test@example.com' },
            { id: 'password', value: 'testpass123' }
          ]
        })
      });
      
      if (response.status === 503) {
        const data = await response.json();
        console.log(`✅ ${endpoint}: Properly disabled (503 - ${data.message})`);
      } else {
        console.log(`❌ ${endpoint}: SECURITY ISSUE - Should return 503 in production (status: ${response.status})`);
      }
    } catch (error) {
      console.log(`⚠️  ${endpoint}: Connection error (server may not be running)`);
    }
  }

  console.log('\n📋 Test 3: Production mode with explicit override (NODE_ENV=production, ALLOW_MOCK_AUTH=true)');
  process.env.NODE_ENV = 'production';
  process.env.ALLOW_MOCK_AUTH = 'true';
  
  for (const endpoint of mockEndpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formFields: [
            { id: 'email', value: 'test@example.com' },
            { id: 'password', value: 'testpass123' }
          ]
        })
      });
      
      if (response.status === 503) {
        console.log(`❌ ${endpoint}: Should be available with ALLOW_MOCK_AUTH=true`);
      } else {
        console.log(`✅ ${endpoint}: Available with explicit override (status: ${response.status})`);
      }
    } catch (error) {
      console.log(`⚠️  ${endpoint}: Connection error (server may not be running)`);
    }
  }

  console.log('\n🎯 Security Test Summary:');
  console.log('- Mock auth should work in development mode');
  console.log('- Mock auth should return 503 in production mode');
  console.log('- Mock auth should work in production only with ALLOW_MOCK_AUTH=true');
  console.log('\n⚠️  To run this test, start the server with: npm run dev');
}

if (require.main === module) {
  testMockAuthSecurity().catch(console.error);
}

module.exports = { testMockAuthSecurity };
