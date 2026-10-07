import { test, expect } from '@playwright/test';
import { GAME_CATALOG } from '../../src/data/gameCatalog';

// Layout/input checks do not need background installation in every context.
// Offline installation is exercised separately with service workers allowed.
test.use({ serviceWorkers: 'block' });

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
    if (route === '/draw') await expect(page.getByRole('region', { name: 'Çizim alanı' }).locator('canvas').first()).toBeVisible();
    await expect(page.getByRole('main')).toHaveCount(1);
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

test.describe('offline installation', () => {
test.use({ serviceWorkers: 'allow' });
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

test('runner HUD stays clear of pause controls during play', async ({ page, isMobile }) => {
  if (isMobile) await page.setViewportSize({ width:844, height:390 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/games/runner');
  await page.getByRole('button', { name:/BAŞLA/ }).first().click();
  const distance = page.getByText(/📏 \d+m/, { exact:true }).first();
  await expect(distance).toBeVisible();
  const pause = page.getByRole('button', { name:'Oyunu duraklat' });
  await expect(pause).toBeVisible();
  const distanceBox = await distance.boundingBox();
  const pauseBox = await pause.boundingBox();
  expect(distanceBox).not.toBeNull();
  expect(pauseBox).not.toBeNull();
  expect(distanceBox!.x + distanceBox!.width).toBeLessThan(pauseBox!.x);
  await page.screenshot({ path:test.info().outputPath('runner.png') });
  await pause.click();
  const pausedDistance = await distance.textContent();
  await page.waitForTimeout(500);
  await expect(distance).toHaveText(pausedDistance!);
  await page.getByRole('button', { name:'Devam et', exact:true }).click();
  await expect(distance).not.toHaveText(pausedDistance!);
  expect(errors).toEqual([]);
});

test.describe('snake input and field',()=>{
test('snake remains inside the visible field across both horizontal edges', async ({ page, isMobile }) => {
  await page.goto('/games/snake');
  await page.getByRole('button', { name: /BAŞLA/ }).waitFor();
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 500));
  const start=page.getByRole('button', { name: /BAŞLA/ });
  if(isMobile)await start.tap();else await start.click();
  const board = page.getByRole('application', { name: 'Snake Game Board' });
  await expect(board).toBeVisible();
  // Three complete crossings catch clipping that a menu overflow check misses.
  for (let tick = 0; tick < 54; tick++) {
    await page.clock.runFor(130);
    const visibleFractions = await board.evaluate(field => {
      const clips = [field.getBoundingClientRect(), field.parentElement!.getBoundingClientRect()];
      return [...field.querySelectorAll(':scope > .z-20')].map(segment => {
        const r = segment.getBoundingClientRect();
        const left = Math.max(r.left, ...clips.map(c => c.left));
        const right = Math.min(r.right, ...clips.map(c => c.right));
        const top = Math.max(r.top, ...clips.map(c => c.top));
        const bottom = Math.min(r.bottom, ...clips.map(c => c.bottom));
        return Math.max(0, right-left) * Math.max(0, bottom-top) / (r.width*r.height);
      });
    });
    expect(visibleFractions.length).toBeGreaterThanOrEqual(3);
    expect(Math.min(...visibleFractions), `visible snake fraction at tick ${tick}`).toBeGreaterThan(.95);
    await expect(page.getByText('Game Over!', { exact: true })).toHaveCount(0);
    if (tick === 7) await page.screenshot({ path: test.info().outputPath('snake-edge.png'), fullPage: true, scale: 'css' });
  }
});

test('snake accepts two quick turns without reversing into its own body', async ({ page, isMobile }) => {
  await page.goto('/games/snake');
  await page.getByRole('button', { name: /BAŞLA/ }).waitFor();
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 500));
  const start=page.getByRole('button', { name: /BAŞLA/ });
  if(isMobile)await start.tap();else await start.click();
  await expect(page.getByRole('application')).toBeVisible();
  await page.clock.runFor(400);
  const head = page.getByRole('application').locator(':scope > .z-20').first();
  const point = () => head.evaluate(element => ({ x:parseFloat((element as HTMLElement).style.left), y:parseFloat((element as HTMLElement).style.top) }));
  const before = await point();
  if (isMobile) {
    await page.getByRole('button', { name:'Move Up', exact:true }).click();
    await page.getByRole('button', { name:'Move Left', exact:true }).click();
  } else {
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowLeft');
  }
  await page.clock.runFor(260);
  expect(await point()).toEqual({ x:before.x-20, y:before.y-20 });
  await expect(page.getByText('Game Over!', { exact:true })).toHaveCount(0);
});
});
