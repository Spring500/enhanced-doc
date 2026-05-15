import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
  },
  webServer: {
    command: 'npx serve . -p 8080 --no-clipboard',
    cwd: '.',
    port: 8080,
    reuseExistingServer: true,
  },
});
