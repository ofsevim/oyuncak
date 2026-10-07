import { test, expect } from '@playwright/test';
import { GAME_CATALOG } from '../../src/data/gameCatalog';
test.use({ serviceWorkers:'block' });

const activeSelectors: Record<string,string> = {
  balloon:'button[aria-label$=" balon"]', basketball:'[aria-label="Basketbol Sahası"]',
  'tank-arena':'iframe[title="Tank Arena"]', whack:'.garden-game-content .grid',
  runner:'[data-game-area]', tetris:'button[aria-label="Sert düşüş"]', snake:'[aria-label="Snake Game Board"]',
  'odd-one-out':'.garden-game-content .grid button', shapematch:'.garden-game-content button.w-20',
  simonsays:'button[aria-label$="düğme"]', memory:'.garden-memory-card',
  '2048':'button[aria-label="Yeniden başlat"]', piano:'button[aria-label="Do notası"]',
  counting:'.garden-game-content button.relative.touch-manipulation', math:'.garden-answer', codingturtle:'.garden-game-content button.w-14',
  spaceshooter:'.garden-game-content canvas', 'connect-four':'button[aria-label="1. sütuna taş bırak"]',
  'word-search':'button[aria-label^="1. satır"]', 'color-sort':'button[aria-label^="1. tüp:"]',
};

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
    await expect(page.getByText('Yükleniyor…', { exact: true })).toHaveCount(0);
    // Immediate-play games are explicit; a missing/late start button is a failure.
    const start = page.getByRole('button', { name: /BAŞLA|Başla|Başlat|Oyna/ }).first();
    if (!['memory','piano','basketball','tank-arena'].includes(game.id)) {
      await expect(start).toBeVisible();
      await start.click();
      await expect(start).toHaveCount(0);
    }
    await expect(page.locator(activeSelectors[game.id]).first()).toBeVisible();
    if (game.id === 'tank-arena') await expect(page.frameLocator('iframe[title="Tank Arena"]').locator('canvas')).toBeVisible();
    const emptyControls = await page.locator('.garden-game-content button:visible').evaluateAll(buttons =>
      buttons.filter(button => !(button.getAttribute('aria-label') || button.getAttribute('title') || (button as HTMLElement).innerText.trim()))
        .map(button => button.outerHTML.slice(0,200)));
    expect(emptyControls,'play controls must carry visible content or an accessible name').toEqual([]);
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
