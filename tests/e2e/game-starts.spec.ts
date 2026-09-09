import { test, expect } from '@playwright/test';
import { GAME_CATALOG } from '../../src/data/gameCatalog';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('oyuncak.nickname.asked', '1');
    localStorage.setItem('oyuncak.preferences.v1', JSON.stringify({ shareScores: false, reducedMotion: false, breakMinutes: 0 }));
  });
  await context.route(/googleapis\.com|firebaseio\.com/, route => route.abort());
});

for (const game of GAME_CATALOG) {
  test(`${game.id} opens and starts without a render error`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/games/${game.id}`);
    await expect(page.getByRole('button', { name: 'Oyunlara Dön', exact: true })).toBeVisible();
    // Some games start immediately; others expose a start screen.
    const start = page.getByRole('button', { name: /BAŞLA|Başla|Başlat|Oyna/ }).first();
    if (await start.count()) await start.click();
    await page.waitForTimeout(1500);
    await expect(page.getByText('Bir şeyler yanlış gitti', { exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('balloon runs its countdown, pauses, finishes and restarts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/games/balloon');
  await page.getByRole('button', { name: /Kolay/ }).click();
  await page.getByRole('button', { name: /BAŞLA/ }).click();
  await expect(page.getByRole('button', { name: / balon$/ }).first()).toBeAttached();
  await expect(page.getByText('⏱️ 44s', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Oyunu duraklat' }).click();
  const timer = page.getByText(/⏱️ \d+s/);
  const pausedTime = await timer.textContent();
  await page.waitForTimeout(1500);
  await expect(timer).toHaveText(pausedTime!);
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Süre Doldu!' })).toBeVisible({ timeout: 50_000 });
  await page.getByRole('button', { name: /Tekrar Oyna/ }).click();
  await expect(page.getByRole('button', { name: / balon$/ }).first()).toBeAttached();
  expect(errors).toEqual([]);
});
