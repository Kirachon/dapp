import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
const resolvedBaseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
console.log(`🔧 Playwright baseURL: ${resolvedBaseURL}`);

export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. Prefer env (set by runner), default to 3001 */
    baseURL: resolvedBaseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Slow down actions to make them visible in headed mode */
    launchOptions: {
      slowMo: process.env.CI ? 0 : 200, // No slowdown in CI
      args: [
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-background-timer-throttling',
      ],
    },

    /* Optimized timeouts for better stability */
    actionTimeout: process.env.CI ? 30000 : 15000, // Longer timeout in CI
    navigationTimeout: process.env.CI ? 45000 : 20000, // Longer timeout in CI

    // Note: 'waitForLoadState' is not a valid global 'use' option; remove to satisfy type-check

    /* Ignore HTTPS errors for local development */
    ignoreHTTPSErrors: true,

    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  /* Global test timeout */
  timeout: 60000, // 1 minute per test

  /* Global expect timeout */
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Run headless in CI, headed in development
        headless: !!process.env.CI,
        // Override viewport to ensure elements are visible
        viewport: { width: 1280, height: 720 },
        // Additional Chrome-specific options for stability
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-background-timer-throttling',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
        },
      },
    },

    // Only run Firefox and WebKit in CI or when explicitly requested
    ...(process.env.CI || process.env.ALL_BROWSERS ? [
      {
        name: 'firefox',
        use: {
          ...devices['Desktop Firefox'],
          headless: !!process.env.CI,
          viewport: { width: 1280, height: 720 },
        },
      },

      {
        name: 'webkit',
        use: {
          ...devices['Desktop Safari'],
          headless: !!process.env.CI,
          viewport: { width: 1280, height: 720 },
        },
      },
    ] : []),

    // Mobile tests only in CI or when explicitly requested
    ...(process.env.CI || process.env.MOBILE_TESTS ? [
      {
        name: 'Mobile Chrome',
        use: {
          ...devices['Pixel 5'],
          headless: !!process.env.CI,
        },
      },
      {
        name: 'Mobile Safari',
        use: {
          ...devices['iPhone 12'],
          headless: !!process.env.CI,
        },
      },
    ] : []),

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run dev:both',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
