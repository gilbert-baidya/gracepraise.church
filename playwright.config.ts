import { defineConfig, devices, type Project } from '@playwright/test';

const suite = process.env.PLAYWRIGHT_SUITE;
if (suite && !['pr', 'nightly'].includes(suite)) {
  throw new Error(`Unknown PLAYWRIGHT_SUITE: ${suite}`);
}
const crossBrowserTests = [
  '**/navigation/*.spec.ts',
  '**/regression/device-theme-regression.spec.ts',
  '**/devotion/critical-navigation-and-render-regression.spec.ts',
  '**/footer/site-footer.spec.ts'
];

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/*.test.js', '**/*.test.mjs', '**/production-publication.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  grepInvert: suite === 'pr' ? /@quarantine/ : undefined,
  reporter: process.env.CI 
    ? [['blob'], ['list']]  // CI: blob reports for sharding
    : [
        ['./test-dashboard-reporter.js', { outputFile: 'test-dashboard.html' }],
        ['list'],
        ['html', { open: 'never' }]
      ],  // Local: Dashboard + HTML reports
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    // ========================================
    // DESKTOP DEVICES
    // ========================================
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      }
    },
    {
      name: 'Desktop Safari',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      }
    },
    {
      name: 'Desktop Firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      }
    },

    // ========================================
    // TABLET DEVICES (iPad Focus)
    // ========================================
    {
      name: 'iPad Pro 11 Portrait',
      use: {
        ...devices['iPad Pro 11'],
        // iPad Pro 11: 834x1194 portrait (matches audit target)
      }
    },
    {
      name: 'iPad Pro 11 Landscape',
      use: {
        ...devices['iPad Pro 11 landscape'],
        // iPad Pro 11: 1194x834 landscape (1024px breakpoint test)
      }
    },

    // ========================================
    // MOBILE DEVICES
    // ========================================
    {
      name: 'iPhone 14',
      use: {
        ...devices['iPhone 14'],
        // iOS Safari primary target
      }
    },
    {
      name: 'Pixel 7',
      use: {
        ...devices['Pixel 7'],
        // Android Chrome primary target
      }
    }
  ].flatMap((project): Project[] => [{
    ...project,
    ...(suite ? {
      testMatch: project.name === 'Desktop Chrome' ? '**/*.spec.ts'
        : project.name === 'Desktop Safari' ? [...crossBrowserTests, '**/home/activity-rail.spec.ts'] : crossBrowserTests,
      testIgnore: [
        '**/production-publication.spec.ts',
        ...(suite === 'pr' ? ['**/visual/**', '**/performance/**'] : [])
      ]
    } : {})
  }, ...(suite === 'nightly' && project.name !== 'Desktop Chrome' ? [{
    ...project,
    name: `${project.name} Quarantine`,
    testMatch: '**/*.spec.ts',
    testIgnore: [...crossBrowserTests, '**/production-publication.spec.ts', '**/visual/**', '**/performance/**'],
    grep: /@quarantine/
  }] : [])]).concat(process.env.PRODUCTION_BASE_URL ? [{
    name: 'Production Chrome',
    use: {
      ...devices['Desktop Chrome'],
      baseURL: process.env.PRODUCTION_BASE_URL
    },
    testMatch: ['**/production-publication.spec.ts'],
    testIgnore: []
  }] : [])
});
