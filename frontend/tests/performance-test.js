#!/usr/bin/env node

/**
 * Performance test runner for E2E tests
 * Measures test execution time and identifies slow tests
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  testDir: 'tests',
  maxTestTime: 60000, // 1 minute per test
  maxSuiteTime: 300000, // 5 minutes total
  performanceThresholds: {
    auth: 15000, // 15 seconds
    onboarding: 30000, // 30 seconds
    messaging: 20000, // 20 seconds
    discovery: 25000, // 25 seconds
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
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runPlaywrightTest(testFile, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const args = [
      'playwright', 'test',
      testFile,
      '--reporter=json',
      '--output=test-results/performance',
      ...Object.entries(options).map(([key, value]) => `--${key}=${value}`)
    ];

    log(`Running: npx ${args.join(' ')}`, 'cyan');
    
    const child = spawn('npx', args, {
      cwd: process.cwd(),
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      const result = {
        testFile,
        duration,
        exitCode: code,
        stdout,
        stderr,
        success: code === 0
      };

      if (code === 0) {
        resolve(result);
      } else {
        reject(result);
      }
    });

    child.on('error', (error) => {
      reject({
        testFile,
        duration: Date.now() - startTime,
        error: error.message,
        success: false
      });
    });
  });
}

async function measureTestPerformance() {
  log('\n⏱️  Measuring Test Performance...', 'bright');
  
  const testFiles = [
    'auth.spec.ts',
    'onboarding.spec.ts',
    'messaging.spec.ts',
    'discovery.spec.ts'
  ];

  const results = [];
  const startTime = Date.now();

  for (const testFile of testFiles) {
    const testPath = path.join(config.testDir, testFile);
    
    if (!fs.existsSync(testPath)) {
      log(`⚠️  Test file not found: ${testFile}`, 'yellow');
      continue;
    }

    try {
      log(`\n🧪 Running ${testFile}...`, 'blue');
      
      const result = await runPlaywrightTest(testFile, {
        headed: false, // Run headless for performance measurement
        workers: 1,    // Single worker for consistent timing
      });

      results.push(result);
      
      const seconds = (result.duration / 1000).toFixed(2);
      const testName = testFile.replace('.spec.ts', '');
      const threshold = config.performanceThresholds[testName];
      
      if (threshold && result.duration > threshold) {
        log(`⚠️  ${testFile}: ${seconds}s (exceeds ${threshold/1000}s threshold)`, 'yellow');
      } else {
        log(`✅ ${testFile}: ${seconds}s`, 'green');
      }
      
    } catch (error) {
      log(`❌ ${testFile}: Failed`, 'red');
      results.push(error);
    }
  }

  const totalTime = Date.now() - startTime;
  
  return {
    results,
    totalTime,
    summary: generatePerformanceSummary(results, totalTime)
  };
}

function generatePerformanceSummary(results, totalTime) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  const avgTime = successful.length > 0 
    ? successful.reduce((sum, r) => sum + r.duration, 0) / successful.length 
    : 0;

  const slowTests = successful.filter(r => {
    const testName = r.testFile.replace('.spec.ts', '');
    const threshold = config.performanceThresholds[testName];
    return threshold && r.duration > threshold;
  });

  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    totalTime,
    averageTime: avgTime,
    slowTests: slowTests.length,
    exceedsMaxTime: totalTime > config.maxSuiteTime
  };
}

async function optimizeTestConfiguration() {
  log('\n🔧 Optimizing Test Configuration...', 'bright');
  
  const optimizations = [];

  // Check if running in CI
  if (process.env.CI) {
    optimizations.push('CI environment detected - using optimized settings');
  }

  // Check available CPU cores
  const os = require('os');
  const cpuCount = os.cpus().length;
  const recommendedWorkers = Math.max(1, Math.floor(cpuCount / 2));
  
  optimizations.push(`Recommended workers: ${recommendedWorkers} (${cpuCount} CPU cores available)`);

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  
  if (memoryMB > 500) {
    optimizations.push(`High memory usage detected: ${memoryMB}MB`);
  }

  // Generate optimized config
  const optimizedConfig = {
    workers: process.env.CI ? 2 : recommendedWorkers,
    retries: process.env.CI ? 2 : 1,
    timeout: process.env.CI ? 45000 : 30000,
    use: {
      actionTimeout: process.env.CI ? 30000 : 15000,
      navigationTimeout: process.env.CI ? 45000 : 20000,
    }
  };

  log('\n📋 Optimization Recommendations:', 'blue');
  optimizations.forEach(opt => log(`  • ${opt}`, 'cyan'));
  
  log('\n⚙️  Optimized Configuration:', 'blue');
  log(JSON.stringify(optimizedConfig, null, 2), 'cyan');

  return optimizedConfig;
}

async function runStabilityCheck() {
  log('\n🔍 Running Stability Check...', 'bright');
  
  const testFile = 'auth.spec.ts'; // Use auth as stability test
  const runs = 3;
  const results = [];

  for (let i = 1; i <= runs; i++) {
    log(`\n🔄 Stability run ${i}/${runs}...`, 'blue');
    
    try {
      const result = await runPlaywrightTest(testFile, {
        headed: false,
        workers: 1,
      });
      
      results.push({
        run: i,
        success: true,
        duration: result.duration
      });
      
      log(`✅ Run ${i}: ${(result.duration / 1000).toFixed(2)}s`, 'green');
      
    } catch (error) {
      results.push({
        run: i,
        success: false,
        duration: error.duration || 0,
        error: error.error || 'Test failed'
      });
      
      log(`❌ Run ${i}: Failed`, 'red');
    }
  }

  const successRate = (results.filter(r => r.success).length / runs) * 100;
  const avgDuration = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.success).length;

  const stability = {
    runs,
    successRate,
    averageDuration: avgDuration,
    isStable: successRate >= 90, // 90% success rate required
    results
  };

  log(`\n📊 Stability Results:`, 'bright');
  log(`  Success Rate: ${successRate.toFixed(1)}%`, successRate >= 90 ? 'green' : 'red');
  log(`  Average Duration: ${(avgDuration / 1000).toFixed(2)}s`, 'cyan');
  log(`  Stability: ${stability.isStable ? 'STABLE' : 'UNSTABLE'}`, 
      stability.isStable ? 'green' : 'red');

  return stability;
}

async function generateReport(performance, stability, optimization) {
  log('\n📋 Generating Performance Report...', 'bright');
  
  const report = {
    timestamp: new Date().toISOString(),
    performance,
    stability,
    optimization,
    recommendations: []
  };

  // Generate recommendations
  if (performance.summary.exceedsMaxTime) {
    report.recommendations.push('Consider running tests in parallel or reducing test scope');
  }

  if (performance.summary.slowTests > 0) {
    report.recommendations.push('Optimize slow tests or increase timeout thresholds');
  }

  if (!stability.isStable) {
    report.recommendations.push('Investigate test flakiness and add stability improvements');
  }

  if (performance.summary.failed > 0) {
    report.recommendations.push('Fix failing tests before measuring performance');
  }

  // Save report
  const reportPath = 'test-results/performance-report.json';
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Display summary
  log('\n🎯 Performance Summary:', 'bright');
  log(`  Total Tests: ${performance.summary.total}`, 'cyan');
  log(`  Success Rate: ${((performance.summary.successful / performance.summary.total) * 100).toFixed(1)}%`, 'cyan');
  log(`  Total Time: ${(performance.summary.totalTime / 1000).toFixed(2)}s`, 'cyan');
  log(`  Average Time: ${(performance.summary.averageTime / 1000).toFixed(2)}s`, 'cyan');
  log(`  Slow Tests: ${performance.summary.slowTests}`, 'cyan');
  log(`  Stability: ${stability.successRate.toFixed(1)}%`, 'cyan');

  if (report.recommendations.length > 0) {
    log('\n💡 Recommendations:', 'yellow');
    report.recommendations.forEach(rec => log(`  • ${rec}`, 'yellow'));
  }

  log(`\n📄 Full report saved to: ${reportPath}`, 'blue');
  
  return report;
}

async function main() {
  log('🚀 Starting E2E Test Performance Analysis', 'bright');
  log('==========================================', 'bright');

  try {
    // Run performance measurement
    const performance = await measureTestPerformance();
    
    // Run stability check
    const stability = await runStabilityCheck();
    
    // Generate optimization recommendations
    const optimization = await optimizeTestConfiguration();
    
    // Generate final report
    const report = await generateReport(performance, stability, optimization);
    
    // Exit with appropriate code
    const isHealthy = 
      performance.summary.failed === 0 && 
      stability.isStable && 
      !performance.summary.exceedsMaxTime;
    
    if (isHealthy) {
      log('\n🎉 All performance checks passed!', 'green');
      process.exit(0);
    } else {
      log('\n⚠️  Performance issues detected. See report for details.', 'yellow');
      process.exit(1);
    }
    
  } catch (error) {
    log(`💥 Performance analysis failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  measureTestPerformance,
  runStabilityCheck,
  optimizeTestConfiguration,
  generateReport
};
