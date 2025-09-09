#!/usr/bin/env node

/**
 * Test script to verify Content Security Policy configuration
 * Tests that CSP headers are properly configured for security
 */

const fetch = require('node-fetch');

async function testCSPConfiguration() {
  console.log('🛡️  Testing Content Security Policy Configuration...\n');

  const baseUrl = 'http://localhost:8080';
  const testEndpoints = [
    '/graphql',
    '/health',
    '/api/photos/upload-url'
  ];

  console.log('📋 Testing CSP Headers...\n');
  
  for (const endpoint of testEndpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const cspHeader = response.headers.get('content-security-policy');
      const cspReportOnlyHeader = response.headers.get('content-security-policy-report-only');
      
      console.log(`🔍 ${endpoint}:`);
      
      if (cspHeader) {
        console.log(`  ✅ CSP Header present`);
        
        // Check for security directives
        const directives = cspHeader.split(';').map(d => d.trim());
        const checks = {
          'default-src': directives.some(d => d.startsWith('default-src')),
          'script-src': directives.some(d => d.startsWith('script-src')),
          'style-src': directives.some(d => d.startsWith('style-src')),
          'object-src': directives.some(d => d.includes("object-src 'none'")),
          'frame-src': directives.some(d => d.includes("frame-src 'none'"))
        };
        
        Object.entries(checks).forEach(([directive, present]) => {
          if (present) {
            console.log(`    ✅ ${directive} directive configured`);
          } else {
            console.log(`    ⚠️  ${directive} directive missing`);
          }
        });
        
        // Check for unsafe directives
        if (cspHeader.includes("'unsafe-inline'")) {
          console.log(`    ⚠️  Contains 'unsafe-inline' (may be acceptable in development)`);
        } else {
          console.log(`    ✅ No 'unsafe-inline' found (good for production)`);
        }
        
        if (cspHeader.includes("'unsafe-eval'")) {
          console.log(`    ⚠️  Contains 'unsafe-eval' (may be acceptable in development)`);
        } else {
          console.log(`    ✅ No 'unsafe-eval' found (good for production)`);
        }
        
      } else if (cspReportOnlyHeader) {
        console.log(`  ℹ️  CSP Report-Only Header present (testing mode)`);
      } else {
        console.log(`  ❌ No CSP header found`);
      }
      
      // Check other security headers
      const securityHeaders = {
        'X-Frame-Options': response.headers.get('x-frame-options'),
        'X-Content-Type-Options': response.headers.get('x-content-type-options'),
        'X-XSS-Protection': response.headers.get('x-xss-protection'),
        'Referrer-Policy': response.headers.get('referrer-policy')
      };
      
      Object.entries(securityHeaders).forEach(([header, value]) => {
        if (value) {
          console.log(`    ✅ ${header}: ${value}`);
        } else {
          console.log(`    ⚠️  ${header}: not set`);
        }
      });
      
      console.log('');
      
    } catch (error) {
      console.log(`⚠️  ${endpoint}: Connection error (server may not be running)`);
    }
  }
}

async function testCSPViolations() {
  console.log('🧪 Testing CSP Violation Detection...\n');
  
  // This would typically be done in a browser environment
  // Here we just check if the CSP would block common XSS vectors
  
  const baseUrl = 'http://localhost:8080';
  
  try {
    const response = await fetch(`${baseUrl}/graphql`, {
      method: 'GET'
    });
    
    const cspHeader = response.headers.get('content-security-policy');
    
    if (!cspHeader) {
      console.log('❌ No CSP header to test violations against');
      return;
    }
    
    console.log('CSP Policy Analysis:');
    console.log(`Policy: ${cspHeader}\n`);
    
    // Analyze policy for common vulnerabilities
    const vulnerabilities = [];
    
    if (cspHeader.includes("'unsafe-inline'") && cspHeader.includes('script-src')) {
      vulnerabilities.push("Script 'unsafe-inline' allows inline JavaScript execution");
    }
    
    if (cspHeader.includes("'unsafe-eval'")) {
      vulnerabilities.push("'unsafe-eval' allows eval() and similar functions");
    }
    
    if (cspHeader.includes('*') && !cspHeader.includes("'self'")) {
      vulnerabilities.push("Wildcard (*) without 'self' is overly permissive");
    }
    
    if (!cspHeader.includes("object-src 'none'")) {
      vulnerabilities.push("object-src not set to 'none' - allows plugins");
    }
    
    if (vulnerabilities.length === 0) {
      console.log('✅ No obvious CSP vulnerabilities detected');
    } else {
      console.log('⚠️  Potential CSP vulnerabilities:');
      vulnerabilities.forEach(vuln => console.log(`  - ${vuln}`));
    }
    
  } catch (error) {
    console.log('⚠️  Could not analyze CSP policy (server may not be running)');
  }
}

async function testEnvironmentSpecificCSP() {
  console.log('\n🔄 Testing Environment-Specific CSP...\n');
  
  const currentEnv = process.env.NODE_ENV || 'development';
  console.log(`Current NODE_ENV: ${currentEnv}`);
  
  if (currentEnv === 'production') {
    console.log('📋 Production CSP Expectations:');
    console.log('  - Should NOT contain unsafe-inline for scripts');
    console.log('  - Should NOT contain unsafe-eval');
    console.log('  - Should use strict-dynamic or nonces');
    console.log('  - Should have restrictive connect-src');
  } else {
    console.log('📋 Development CSP Expectations:');
    console.log('  - May contain unsafe-inline for hot reload');
    console.log('  - May contain unsafe-eval for dev tools');
    console.log('  - Should be more permissive for development');
  }
}

if (require.main === module) {
  testCSPConfiguration()
    .then(() => testCSPViolations())
    .then(() => testEnvironmentSpecificCSP())
    .catch(console.error);
}

module.exports = { testCSPConfiguration, testCSPViolations };
