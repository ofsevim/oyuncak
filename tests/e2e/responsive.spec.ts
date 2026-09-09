import { test, expect } from '@playwright/test';
import { GAME_CATALOG } from '../../src/data/gameCatalog';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('oyuncak.nickname.asked', '1');
    localStorage.setItem('oyuncak.preferences.v1', JSON.stringify({ shareScores:false, reducedMotion:false, breakMinutes:0 }));
  });
  await context.route(/googleapis\.com|firebaseio\.com/, r => r.abort());
});

for (const route of ['/', '/games', '/draw', '/story', '/parents', ...GAME_CATALOG.map(g => `/games/${g.id}`)]) {
  test(`layout fits ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await page.waitForTimeout(350);
    const overflow = await page.evaluate(() => {
      const main = document.querySelector('main')!;
      return { root:document.documentElement.scrollWidth - innerWidth, main:main.scrollWidth - main.clientWidth };
    });
    expect(overflow.root).toBeLessThanOrEqual(2);
    expect(overflow.main).toBeLessThanOrEqual(2);
    await expect(page.getByText('Bir şeyler yanlış gitti', { exact:true })).toHaveCount(0);
  });
}

test('tank iframe loads after redirected precaching and reloads offline', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit' && process.platform === 'win32', 'Windows WebKit reports an internal navigation error when forced offline; run in Linux CI.');
  await page.goto('/games/tank-arena');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect(page.frameLocator('iframe[title="Tank Arena"]').locator('canvas')).toBeVisible();
  await context.setOffline(true);
  await context.unrouteAll();
  await page.reload();
  await expect(page.frameLocator('iframe[title="Tank Arena"]').locator('canvas')).toBeVisible();
});

test('tank controls remain available on touch screens after rotation', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch control check');
  await page.goto('/games/tank-arena');
  await expect(page.frameLocator('iframe[title="Tank Arena"]').locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name:/BAŞLAT/ })).toBeVisible();
  await page.getByRole('button', { name:/BAŞLAT/ }).tap();
  await page.setViewportSize({ width:844, height:390 });
  await expect(page.getByRole('button', { name:/BAŞLAT/ })).toBeVisible();
});
