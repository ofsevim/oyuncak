import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e', timeout: 60_000, fullyParallel: false,
  workers: 4,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
    { name: 'small-phone', testMatch: /responsive\.spec\.ts/, use: { ...devices['Pixel 7'], viewport: { width: 320, height: 640 } } },
    { name: 'touch-landscape', testMatch: /responsive\.spec\.ts/, use: { ...devices['Pixel 7'], viewport: { width: 844, height: 390 } } },
    { name: 'tablet', testMatch: /responsive\.spec\.ts/, use: { ...devices['Pixel 7'], viewport: { width: 768, height: 1024 } } },
  ],
  webServer: {
    command: 'npm run build -- --mode test && node tests/server/preview.mjs',
    url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 180_000,
    env: {
      VITE_PUBLIC_URL: 'https://oyuncak.app',
      VITE_FIREBASE_API_KEY: 'test-api-key', VITE_FIREBASE_AUTH_DOMAIN: 'demo-oyuncak.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'demo-oyuncak', VITE_FIREBASE_STORAGE_BUCKET: 'demo-oyuncak.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789', VITE_FIREBASE_APP_ID: '1:123456789:web:test',
    },
  },
});
