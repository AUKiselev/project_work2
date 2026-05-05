import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://app.localhost';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: { baseURL, trace: 'on-first-retry', viewport: { width: 390, height: 844 } },
  projects: [{ name: 'chromium', use: { ...devices['Pixel 7'] } }],
});
