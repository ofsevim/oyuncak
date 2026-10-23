import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('oyuncak.nickname.asked', '1');
    localStorage.setItem('oyuncak.preferences.v1', JSON.stringify({ shareScores: false, reducedMotion: false, breakMinutes: 0 }));
  });
  await context.route(/googleapis\.com|firebaseio\.com/, route => route.abort());
});

test('capture brick-breaker playing screenshot', async ({ page }) => {
  await page.goto('/games/brick-breaker');
  const startBtn = page.getByRole('button', { name: /Oyunu Başlat|BAŞLA|Başlat|Oyna/ }).first();
  await expect(startBtn).toBeVisible();
  await startBtn.click();
  await expect(page.locator('.garden-game-content canvas')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/brick-breaker-playing.png' });
});
