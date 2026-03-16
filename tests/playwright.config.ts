import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir:  './e2e',
  timeout:  30_000,
  use: {
    baseURL:    'http://localhost:5173',
    headless:   true,
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',
  },
  webServer: [
    {
      // Start the gateway before running E2E tests
      command:              'node ../gateway/src/index.js',
      url:                  'http://localhost:3000/health',
      reuseExistingServer:  !process.env.CI,
      env: {
        PORT:    '3000',
        DB_PATH: '/tmp/aura-e2e.db',
      },
    },
    {
      // Start the dashboard dev server
      command:             'npm run dev --prefix ../dashboard',
      url:                 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
