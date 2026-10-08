import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT || 4173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e', timeout: 60_000, fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', testMatch: /(?:responsive|gameplay|stories)\.spec\.ts/, use: { ...devices['iPhone 13'], browserName: 'webkit' } },
    { name: 'small-phone', testMatch: /(?:responsive|stories)\.spec\.ts/, use: { ...devices['Pixel 7'], viewport: { width: 320, height: 640 } } },
    { name: 'touch-landscape', testMatch: /(?:responsive|stories)\.spec\.ts/, use: { ...devices['Pixel 7'], viewport: { width: 844, height: 390 } } },
    { name: 'tablet', testMatch: /(?:responsive|stories)\.spec\.ts/, use: { ...devices['Pixel 7'], viewport: { width: 768, height: 1024 } } },
  ],
  webServer: {
    command: 'node --max-old-space-size=2048 node_modules/vite/bin/vite.js build --mode test --outDir .cache/e2e-dist && node --max-old-space-size=256 tests/server/preview.mjs',
    url: baseURL, reuseExistingServer: false, timeout: 180_000,
    env: {
      PORT: String(port),
      PREVIEW_ROOT: '.cache/e2e-dist',
      VITE_PUBLIC_URL: 'https://oyuncak.app',
      VITE_FIREBASE_API_KEY: 'test-api-key', VITE_FIREBASE_AUTH_DOMAIN: 'demo-oyuncak.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'demo-oyuncak', VITE_FIREBASE_STORAGE_BUCKET: 'demo-oyuncak.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789', VITE_FIREBASE_APP_ID: '1:123456789:web:test',
    },
  },
});
