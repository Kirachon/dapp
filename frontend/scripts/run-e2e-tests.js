#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Dating App E2E Test Suite');
console.log('=============================\n');

// Test suites to run
const testSuites = [
  {
    name: 'Authentication Flow',
    file: 'tests/auth.spec.ts',
    description: 'Tests user signup, signin, and session management'
  },
  {
    name: 'Complete Onboarding Flow',
    file: 'tests/onboarding-flow.spec.ts',
    description: 'Tests the 5-step onboarding process with validation'
  },
  {
    name: 'Discovery and Matching',
    file: 'tests/discovery-matching.spec.ts',
    description: 'Tests profile discovery, swiping, and match detection'
  },
  {
    name: 'Real-time Messaging',
    file: 'tests/messaging-realtime.spec.ts',
    description: 'Tests messaging system with Socket.IO features'
  },
  {
    name: 'Complete User Workflow',
    file: 'tests/e2e-complete-workflow.spec.ts',
    description: 'Tests end-to-end user journeys and integrations'
  }
];

// Configuration
const config = {
  headed: process.argv.includes('--headed') || process.argv.includes('-h'),
  project: process.argv.find(arg => arg.startsWith('--project='))?.split('=')[1] || 'chromium',
  workers: process.argv.find(arg => arg.startsWith('--workers='))?.split('=')[1] || '1',
  timeout: process.argv.find(arg => arg.startsWith('--timeout='))?.split('=')[1] || '60000',
  retries: process.argv.find(arg => arg.startsWith('--retries='))?.split('=')[1] || '1',
  specific: process.argv.find(arg => arg.startsWith('--test='))?.split('=')[1],
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

console.log('Configuration:');
console.log(`  Mode: ${config.headed ? 'Headed (visible browser)' : 'Headless'}`);
console.log(`  Browser: ${config.project}`);
console.log(`  Workers: ${config.workers}`);
console.log(`  Timeout: ${config.timeout}ms`);
console.log(`  Retries: ${config.retries}`);
if (config.specific) {
  console.log(`  Specific test: ${config.specific}`);
}
console.log('');

// Function to run a test suite
function runTestSuite(testSuite) {
  return new Promise((resolve, reject) => {
    console.log(`🏃 Running: ${testSuite.name}`);
    console.log(`   ${testSuite.description}`);
    
    const args = [
      'test',
      testSuite.file,
      `--project=${config.project}`,
      `--workers=${config.workers}`,
      `--timeout=${config.timeout}`,
      `--retries=${config.retries}`
    ];

    if (config.headed) {
      args.push('--headed');
    }

    if (config.verbose) {
      args.push('--reporter=list');
    }

    const startTime = Date.now();
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(npxCmd, ['playwright', ...args], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, PLAYWRIGHT_BASE_URL: (global.__FRONTEND_BASE__ || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001') },
      shell: process.platform === 'win32'
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const durationStr = `${Math.round(duration / 1000)}s`;
      
      if (code === 0) {
        console.log(`✅ ${testSuite.name} completed successfully (${durationStr})\n`);
        resolve({ success: true, duration, name: testSuite.name });
      } else {
        console.log(`❌ ${testSuite.name} failed with code ${code} (${durationStr})\n`);
        resolve({ success: false, duration, name: testSuite.name, code });
      }
    });

    child.on('error', (error) => {
      console.log(`❌ ${testSuite.name} error: ${error.message}\n`);
      reject({ success: false, error: error.message, name: testSuite.name });
    });
  });
}

// Function to check prerequisites
async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  // Check if servers are running
  const http = require('http');
  
  const checkServer = (url, name) => {
    return new Promise((resolve) => {
      const request = http.get(url, (res) => {
        console.log(`✅ ${name} is running`);
        resolve(true);
      });
      
      request.on('error', () => {
        console.log(`❌ ${name} is not running at ${url}`);
        resolve(false);
      });
      
      request.setTimeout(5000, () => {
        console.log(`⏰ ${name} check timed out`);
        resolve(false);
      });
    });
  };

  // Force the test base URL to port 3001. Do NOT fallback to 3000.
  let effectiveFrontendBase = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001';
  const frontendRunning = await checkServer(effectiveFrontendBase, 'Frontend server');
  const apiRunning = await checkServer('http://127.0.0.1:8080/health', 'API server');

  if (!frontendRunning) {
    console.log(`⚠️ Frontend at ${effectiveFrontendBase} did not respond in time, but proceeding with this base to avoid port drift.`);
  }
  if (!apiRunning) {
    console.log('\n⚠️  API health check timed out, but continuing. Ensure API is running at http://127.0.0.1:8080');
  }

  // Expose chosen base URL to child processes
  global.__FRONTEND_BASE__ = effectiveFrontendBase;
  process.env.PLAYWRIGHT_BASE_URL = effectiveFrontendBase;

  console.log(`✅ Using Frontend Base URL: ${effectiveFrontendBase}`);
  console.log('✅ Prerequisite checks completed (non-fatal timeouts ignored)\n');
}

// Main execution
async function main() {
  try {
    await checkPrerequisites();

    const results = [];
    let suitesToRun = testSuites;

    // Filter to specific test if requested
    if (config.specific) {
      suitesToRun = testSuites.filter(suite => 
        suite.file.includes(config.specific) || 
        suite.name.toLowerCase().includes(config.specific.toLowerCase())
      );
      
      if (suitesToRun.length === 0) {
        console.log(`❌ No test suites found matching: ${config.specific}`);
        console.log('Available test suites:');
        testSuites.forEach(suite => console.log(`  - ${suite.name} (${suite.file})`));
        process.exit(1);
      }
    }

    console.log(`🚀 Running ${suitesToRun.length} test suite(s)...\n`);

    // Run test suites sequentially to avoid conflicts
    for (const testSuite of suitesToRun) {
      const result = await runTestSuite(testSuite);
      results.push(result);
    }

    // Summary
    console.log('📊 Test Results Summary');
    console.log('=======================');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Total test suites: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total duration: ${Math.round(totalDuration / 1000)}s`);

    if (failed > 0) {
      console.log('\n❌ Failed test suites:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.name} (exit code: ${r.code || 'unknown'})`);
      });
    }

    console.log('\n📁 Test artifacts:');
    console.log('  - Screenshots: test-results/');
    console.log('  - Videos: test-results/');
    console.log('  - HTML Report: playwright-report/');

    if (failed === 0) {
      console.log('\n🎉 All tests passed successfully!');
      process.exit(0);
    } else {
      console.log('\n💥 Some tests failed. Check the output above for details.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Help text
if (process.argv.includes('--help')) {
  console.log('Usage: node run-e2e-tests.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --headed, -h          Run tests in headed mode (visible browser)');
  console.log('  --project=<browser>   Browser to use (chromium, firefox, webkit)');
  console.log('  --workers=<number>    Number of parallel workers');
  console.log('  --timeout=<ms>        Test timeout in milliseconds');
  console.log('  --retries=<number>    Number of retries for failed tests');
  console.log('  --test=<name>         Run specific test suite');
  console.log('  --verbose, -v         Verbose output');
  console.log('  --help                Show this help');
  console.log('');
  console.log('Examples:');
  console.log('  node run-e2e-tests.js --headed');
  console.log('  node run-e2e-tests.js --test=auth');
  console.log('  node run-e2e-tests.js --project=firefox --workers=2');
  process.exit(0);
}

// Run the tests
main();
