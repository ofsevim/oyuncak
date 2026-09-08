import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e', timeout: 60_000, fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build -- --mode test && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 180_000,
    env: {
      VITE_FIREBASE_API_KEY: 'test-api-key', VITE_FIREBASE_AUTH_DOMAIN: 'demo-oyuncak.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'demo-oyuncak', VITE_FIREBASE_STORAGE_BUCKET: 'demo-oyuncak.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789', VITE_FIREBASE_APP_ID: '1:123456789:web:test',
    },
  },
});
