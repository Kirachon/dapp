#!/usr/bin/env node

/**
 * Test script to verify CORS security configuration
 * Tests that CORS properly restricts origins based on environment
 */

const fetch = require('node-fetch');

async function testCorsConfiguration() {
  console.log('🌐 Testing CORS Security Configuration...\n');

  const baseUrl = 'http://localhost:8080';
  const testEndpoint = '/graphql';
  
  const testOrigins = [
    'http://localhost:3000',      // Should be allowed in dev
    'http://localhost:3001',      // Should be allowed in dev  
    'https://malicious-site.com', // Should be blocked
    'http://evil.example.com',    // Should be blocked
    null                          // No origin header
  ];

  // Test 1: Development mode
  console.log('📋 Test 1: Development mode CORS');
  
  for (const origin of testOrigins) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (origin) {
        headers['Origin'] = origin;
      }
      
      const response = await fetch(`${baseUrl}${testEndpoint}`, {
        method: 'OPTIONS', // Preflight request
        headers
      });
      
      const corsHeader = response.headers.get('access-control-allow-origin');
      const originLabel = origin || 'no-origin';
      
      if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        if (corsHeader === origin || corsHeader === '*') {
          console.log(`✅ ${originLabel}: Correctly allowed (${corsHeader})`);
        } else {
          console.log(`❌ ${originLabel}: Should be allowed but got: ${corsHeader}`);
        }
      } else if (origin && origin.includes('malicious') || origin.includes('evil')) {
        if (!corsHeader || corsHeader !== origin) {
          console.log(`✅ ${originLabel}: Correctly blocked (${corsHeader || 'no header'})`);
        } else {
          console.log(`❌ ${originLabel}: SECURITY ISSUE - Should be blocked but was allowed`);
        }
      } else {
        console.log(`ℹ️  ${originLabel}: Response: ${corsHeader || 'no header'}`);
      }
    } catch (error) {
      console.log(`⚠️  ${origin || 'no-origin'}: Connection error (server may not be running)`);
    }
  }

  console.log('\n📋 Test 2: Production mode CORS (simulated)');
  console.log('Note: This test simulates production behavior based on environment variables');
  
  // Simulate production environment variables
  const productionOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'];
  
  console.log(`Production allowed origins: ${productionOrigins.join(', ')}`);
  
  for (const origin of testOrigins) {
    const originLabel = origin || 'no-origin';
    
    if (!origin) {
      console.log(`ℹ️  ${originLabel}: No origin header - typically allowed`);
      continue;
    }
    
    if (productionOrigins.includes(origin)) {
      console.log(`✅ ${originLabel}: Would be allowed in production`);
    } else {
      console.log(`🔒 ${originLabel}: Would be blocked in production`);
    }
  }

  console.log('\n🎯 CORS Security Test Summary:');
  console.log('- Development should allow localhost origins');
  console.log('- Production should only allow explicitly configured origins');
  console.log('- Malicious origins should always be blocked');
  console.log('- Credentials should be handled securely');
  console.log('\n⚠️  To run this test, start the server with: npm run dev');
  console.log('💡 Set ALLOWED_ORIGINS environment variable to test production behavior');
}

async function testCorsHeaders() {
  console.log('\n🔍 Testing CORS Headers...\n');
  
  const baseUrl = 'http://localhost:8080';
  
  try {
    const response = await fetch(`${baseUrl}/graphql`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    });
    
    const headers = {
      'Access-Control-Allow-Origin': response.headers.get('access-control-allow-origin'),
      'Access-Control-Allow-Methods': response.headers.get('access-control-allow-methods'),
      'Access-Control-Allow-Headers': response.headers.get('access-control-allow-headers'),
      'Access-Control-Allow-Credentials': response.headers.get('access-control-allow-credentials')
    };
    
    console.log('CORS Headers received:');
    Object.entries(headers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value || 'not set'}`);
    });
    
    // Validate expected headers
    if (headers['Access-Control-Allow-Credentials'] === 'true') {
      console.log('✅ Credentials properly enabled');
    } else {
      console.log('❌ Credentials not properly configured');
    }
    
    if (headers['Access-Control-Allow-Methods']?.includes('POST')) {
      console.log('✅ POST method allowed');
    } else {
      console.log('❌ POST method not allowed');
    }
    
  } catch (error) {
    console.log('⚠️  Could not test CORS headers (server may not be running)');
  }
}

if (require.main === module) {
  testCorsConfiguration()
    .then(() => testCorsHeaders())
    .catch(console.error);
}

module.exports = { testCorsConfiguration, testCorsHeaders };
