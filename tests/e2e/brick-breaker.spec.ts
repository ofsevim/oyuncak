import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ context }) => {
  await context.route(/googleapis\.com|firebaseio\.com/, route => route.abort());
  await context.addInitScript(() => {
    localStorage.setItem('oyuncak.nickname.asked', '1');
    localStorage.setItem('oyuncak.preferences.v1', JSON.stringify({ shareScores: false, reducedMotion: true, breakMinutes: 0 }));
    Math.random = () => .5;
  });
});

async function start(page: import('@playwright/test').Page, frameMs?: number) {
  await page.clock.install();
  // The clock stays paused across navigation. Let async startup finish before
  // waiting for the menu, including when the refresh-rate test starts its next run.
  await page.clock.resume();
  await page.goto('/games/brick-breaker');
  await page.getByRole('button', { name: 'Oyunu Başlat', exact: true }).waitFor();
  // Node tarafındaki Date.now()+500 hedefi sahte saatin gerisinde kalabilir
  // ("Cannot fast-forward to the past"). Mutlak zaman yerine saatin şimdiki
  // anında dur ve 500 ms'lik başlangıç zamanlayıcılarını elle ilerlet.
  await page.clock.pause();
  await page.clock.runFor(500);
  if (frameMs) await page.evaluate(frameMs => {
    window.requestAnimationFrame = callback => window.setTimeout(() => callback(performance.now()), frameMs);
    window.cancelAnimationFrame = id => window.clearTimeout(id);
  }, frameMs);
  await page.getByRole('button', { name: 'Oyunu Başlat', exact: true }).click();
  await page.clock.runFor(100);
  return page.locator('.garden-game-content canvas');
}

test('brick breaker draws the complete field at the device pixel density', async ({ page }) => {
  const canvas = await start(page);
  const pixels = await canvas.evaluate(element => {
    const c = element as HTMLCanvasElement;
    const ctx = c.getContext('2d')!;
    return [ctx.getImageData(c.width - 10, c.height - 10, 1, 1).data[3],
      ctx.getImageData(c.width - 10, 10, 1, 1).data[3]];
  });
  expect(pixels).toEqual([255, 255]);
  await page.screenshot({ path: test.info().outputPath('brick-breaker-playing.png'), fullPage: true });
});

test('brick breaker runs at the same speed on fast and slow displays', async ({ page }) => {
  const travel: number[] = [];
  for (const frameMs of [16, 8, 33]) {
    const canvas = await start(page, frameMs);
    await canvas.evaluate(c => {
      const ctx = (c as HTMLCanvasElement).getContext('2d')!;
      const arc = ctx.arc.bind(ctx);
      ctx.arc = (...args: Parameters<typeof ctx.arc>) => {
        if (args[2] >= 6 && args[2] <= 8) c.setAttribute('data-ball-y', String(args[1]));
        arc(...args);
      };
    });
    await page.clock.runFor(50);
    await expect(canvas).toHaveAttribute('data-ball-y', /\d/);
    const before = Number(await canvas.getAttribute('data-ball-y'));
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true })));
    await page.clock.runFor(480);
    travel.push(before - Number(await canvas.getAttribute('data-ball-y')));
  }
  expect(Math.max(...travel) - Math.min(...travel), `ball travel at 60/120/30 Hz: ${travel}`).toBeLessThan(14);
  expect(travel[0]).toBeGreaterThan(150);
});

test('brick breaker field stays inside its container on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const canvas = await start(page);
  const bounds = await canvas.evaluate(element => {
    const r = element.getBoundingClientRect();
    const parent = document.querySelector('.garden-game-content')!.getBoundingClientRect();
    return { left: r.left, right: r.right, parentLeft: parent.left, parentRight: parent.right,
      overflow: document.documentElement.scrollWidth - innerWidth };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(bounds.parentLeft);
  expect(bounds.right).toBeLessThanOrEqual(bounds.parentRight);
  expect(bounds.overflow).toBeLessThanOrEqual(2);
});

test('brick breaker ignores launch input during pause and clears held movement', async ({ page }) => {
  const canvas = await start(page);
  await page.keyboard.down('ArrowRight');
  await page.getByRole('button', { name: 'Oyunu duraklat' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true })));
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.clock.runFor(100);
  const before = await canvas.evaluate(c => (c as HTMLCanvasElement).toDataURL());
  await page.clock.runFor(500);
  const after = await canvas.evaluate(c => (c as HTMLCanvasElement).toDataURL());
  expect(after === before, 'a paused launch or held key must not move the ball or paddle after resuming').toBe(true);
  await page.keyboard.up('ArrowRight');
});

test('brick breaker prevents game keys from scrolling the page', async ({ page }) => {
  await start(page);
  await page.evaluate(() => window.scrollTo(0, 200));
  const prevented = await page.evaluate(() => {
    const event = new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
});

test('brick breaker loses one life per missed ball, saves the score and restarts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await start(page, 33);
  for (const [index, direction] of ['ArrowLeft', 'ArrowRight', 'ArrowLeft'].entries()) {
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true })));
    await page.keyboard.down(direction);
    await page.clock.runFor(1000);
    await page.keyboard.up(direction);
    await page.clock.runFor(4500);
    if (index < 2) await expect(page.locator('.garden-game-content span.opacity-100')).toHaveCount(2 - index);
  }
  await expect(page.getByRole('heading', { name: 'Oyun Bitti!', exact: true })).toBeVisible();
  const saved = await page.evaluate(() => Number(localStorage.getItem('oyuncak.hs.brick-breaker')));
  expect(saved).toBeGreaterThan(0);
  await expect(page.getByText(`✨ ${saved} Puan`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tekrar Oyna', exact: true }).click();
  await expect(page.locator('.garden-game-content canvas')).toBeVisible();
  await expect(page.locator('.garden-game-content span.opacity-100')).toHaveCount(3);
  await expect(page.getByText('⭐ 0', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
