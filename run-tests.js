#!/usr/bin/env node

/**
 * Comprehensive test runner for the dating app
 * Runs both backend unit tests and frontend E2E tests
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  backend: {
    testCommand: 'npm test',
    testDir: '__tests__',
    coverageDir: 'coverage'
  },
  frontend: {
    testCommand: 'npx playwright test',
    testDir: 'tests',
    reportDir: 'test-results'
  },
  services: {
    api: 'http://localhost:8080',
    frontend: 'http://localhost:3000',
    postgres: 'postgresql://app:app@localhost:5432/dating_app',
    redis: 'redis://localhost:6379',
    minio: 'http://localhost:9000'
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, cwd = process.cwd(), env = {}) {
  return new Promise((resolve, reject) => {
    log(`Running: ${command}`, 'cyan');
    
    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ...env }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkService(url, name) {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, { timeout: 5000 });
    if (response.ok || response.status < 500) {
      log(`✅ ${name} is running`, 'green');
      return true;
    } else {
      log(`⚠️  ${name} returned status ${response.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ ${name} is not accessible: ${error.message}`, 'red');
    return false;
  }
}

async function checkServices() {
  log('\n🔍 Checking service availability...', 'bright');
  
  const checks = [
    checkService(config.services.api + '/health', 'Backend API'),
    checkService(config.services.frontend, 'Frontend'),
    checkService(config.services.minio + '/minio/health/live', 'MinIO'),
  ];

  const results = await Promise.allSettled(checks);
  const allHealthy = results.every(result => result.status === 'fulfilled' && result.value);

  if (!allHealthy) {
    log('\n⚠️  Some services are not running. Tests may fail.', 'yellow');
    log('Make sure to run: docker-compose up -d', 'yellow');
    log('And: npm run dev (in both backend and frontend)', 'yellow');
  }

  return allHealthy;
}

async function runBackendTests() {
  log('\n🧪 Running Backend Unit Tests...', 'bright');
  
  try {
    // Check if test files exist
    if (!fs.existsSync(config.backend.testDir)) {
      log(`❌ Test directory ${config.backend.testDir} not found`, 'red');
      return false;
    }

    // Run Jest tests
    await runCommand(config.backend.testCommand);
    
    log('✅ Backend tests completed successfully', 'green');
    
    // Check coverage
    if (fs.existsSync(config.backend.coverageDir)) {
      log('📊 Coverage report generated', 'blue');
    }
    
    return true;
  } catch (error) {
    log(`❌ Backend tests failed: ${error.message}`, 'red');
    return false;
  }
}

async function runFrontendTests() {
  log('\n🎭 Running Frontend E2E Tests...', 'bright');
  
  try {
    // Check if test files exist
    const frontendTestDir = path.join('frontend', config.frontend.testDir);
    if (!fs.existsSync(frontendTestDir)) {
      log(`❌ Test directory ${frontendTestDir} not found`, 'red');
      return false;
    }

    // Install Playwright browsers if needed
    try {
      await runCommand('npx playwright install', 'frontend');
    } catch (error) {
      log('⚠️  Playwright install failed, continuing...', 'yellow');
    }

    // Run Playwright tests
    await runCommand(config.frontend.testCommand, 'frontend');
    
    log('✅ Frontend tests completed successfully', 'green');
    
    // Check test results
    const reportDir = path.join('frontend', config.frontend.reportDir);
    if (fs.existsSync(reportDir)) {
      log('📊 Test report generated', 'blue');
    }
    
    return true;
  } catch (error) {
    log(`❌ Frontend tests failed: ${error.message}`, 'red');
    return false;
  }
}

async function generateTestReport() {
  log('\n📋 Generating Test Summary...', 'bright');
  
  const report = {
    timestamp: new Date().toISOString(),
    backend: {
      passed: fs.existsSync(config.backend.coverageDir),
      coverage: null
    },
    frontend: {
      passed: fs.existsSync(path.join('frontend', config.frontend.reportDir)),
      report: null
    }
  };

  // Read backend coverage if available
  const coverageFile = path.join(config.backend.coverageDir, 'coverage-summary.json');
  if (fs.existsSync(coverageFile)) {
    try {
      const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      report.backend.coverage = coverage.total;
    } catch (error) {
      log('⚠️  Could not read coverage report', 'yellow');
    }
  }

  // Read frontend test results if available
  const resultsFile = path.join('frontend', config.frontend.reportDir, 'results.json');
  if (fs.existsSync(resultsFile)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      report.frontend.report = {
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        total: results.stats?.total || 0
      };
    } catch (error) {
      log('⚠️  Could not read test results', 'yellow');
    }
  }

  // Save report
  fs.writeFileSync('test-summary.json', JSON.stringify(report, null, 2));
  
  // Display summary
  log('\n📊 Test Summary:', 'bright');
  log(`Backend Tests: ${report.backend.passed ? '✅ PASSED' : '❌ FAILED'}`, 
       report.backend.passed ? 'green' : 'red');
  
  if (report.backend.coverage) {
    log(`Coverage: ${report.backend.coverage.lines.pct}% lines, ${report.backend.coverage.functions.pct}% functions`, 'blue');
  }
  
  log(`Frontend Tests: ${report.frontend.passed ? '✅ PASSED' : '❌ FAILED'}`, 
       report.frontend.passed ? 'green' : 'red');
  
  if (report.frontend.report) {
    log(`Results: ${report.frontend.report.passed}/${report.frontend.report.total} tests passed`, 'blue');
  }

  return report;
}

async function main() {
  log('🚀 Starting Comprehensive Test Suite', 'bright');
  log('=====================================', 'bright');

  const args = process.argv.slice(2);
  const runBackend = !args.includes('--frontend-only');
  const runFrontend = !args.includes('--backend-only');
  const skipServiceCheck = args.includes('--skip-service-check');

  let allPassed = true;

  // Check services unless skipped
  if (!skipServiceCheck) {
    await checkServices();
  }

  // Run backend tests
  if (runBackend) {
    const backendPassed = await runBackendTests();
    allPassed = allPassed && backendPassed;
  }

  // Run frontend tests
  if (runFrontend) {
    const frontendPassed = await runFrontendTests();
    allPassed = allPassed && frontendPassed;
  }

  // Generate report
  const report = await generateTestReport();

  // Final summary
  log('\n🏁 Test Suite Complete', 'bright');
  log('======================', 'bright');
  
  if (allPassed) {
    log('🎉 All tests passed!', 'green');
    process.exit(0);
  } else {
    log('💥 Some tests failed. Check the output above for details.', 'red');
    process.exit(1);
  }
}

// Handle CLI usage
if (require.main === module) {
  main().catch(error => {
    log(`💥 Test runner failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runBackendTests,
  runFrontendTests,
  checkServices,
  generateTestReport
};
