import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    if (!location.href.startsWith('http')) return;
    localStorage.setItem('oyuncak.nickname.asked', '1');
    if (!localStorage.getItem('oyuncak.preferences.v1')) localStorage.setItem('oyuncak.preferences.v1', JSON.stringify({ shareScores: false, reducedMotion: false, breakMinutes: 0 }));
  });
  // These tests never send requests to a live Firebase project.
  await context.route(/googleapis\.com|firebaseio\.com/, (route) => route.abort());
});

test('home, discovery and parent links work without bootstrap errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Oyna.*Keşfet/ })).toBeVisible();
  await page.getByRole('button', { name: /Zeka Hafıza/ }).click();
  await expect(page).toHaveURL(/category=brain/);
  await expect(page.getByRole('heading', { name: 'Hafıza Oyunu' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Balon Patlat' })).toHaveCount(0);
  await page.goto('/parents');
  await expect(page.getByRole('heading', { name: /Ebeveyn/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('game pauses, resumes and appears in recent games', async ({ page }) => {
  await page.goto('/games/math');
  await expect(page.getByRole('heading', { name: /Matematik/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Oyunu duraklat' }).click();
  await expect(page.getByRole('dialog', { name: 'Oyun duraklatıldı' })).toBeVisible();
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Oyun duraklatıldı' })).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Son oynanan oyunlar' }).getByRole('link', { name: /Matematik/ })).toBeVisible();
});

test('deep game route reloads offline after complete installation', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit' && process.platform === 'win32', 'Windows WebKit reports an internal navigation error when forced offline; run in Linux CI.');
  await page.goto('/games/math');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  // Disable ALL network before removing interception; this context stays offline until destroyed.
  await context.setOffline(true);
  await context.unrouteAll();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Matematik/ }).first()).toBeVisible();
  await page.goto('/games/word-search');
  await expect(page.getByRole('heading', { name: /Kelime Avı/ }).first()).toBeVisible();

});

test('unknown game routes show a recoverable not-found page', async ({ page }) => {
  await page.goto('/games/not-a-game');
  await expect(page.getByText('404', { exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
});

test('favorites and parent preferences persist after reload', async ({ page }, testInfo) => {
  await page.goto('/games');
  await page.getByRole('button', { name: 'Matematik favorilere ekle' }).waitFor();
  await page.screenshot({ path: testInfo.outputPath('game-menu.png'), fullPage: true });
  await page.getByRole('button', { name: 'Matematik favorilere ekle' }).click();
  await page.getByRole('button', { name: /Favorilerim/, exact: false }).click();
  await expect(page.getByRole('heading', { name: 'Matematik', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Balon Patlat' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Matematik favorilerden çıkar' })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/parents');
  await page.getByLabel('Ayarları açmak için: 7 × 3 kaç eder?').fill('21');
  await page.getByRole('button', { name: 'Ayarları aç', exact: true }).click();
  await page.getByLabel('Animasyonları azalt').check();
  await page.getByRole('combobox', { name: 'Mola hatırlatıcısı' }).selectOption('15');
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/reduced-motion/);
  await page.getByLabel('Ayarları açmak için: 7 × 3 kaç eder?').fill('21');
  await page.getByRole('button', { name: 'Ayarları aç', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Mola hatırlatıcısı' })).toHaveValue('15');
  await expect(page.getByLabel('Global skor paylaşımı')).not.toBeChecked();
});

test('drawing survives reload and deletion requires confirmation', async ({ page }, testInfo) => {
  await page.goto('/draw');
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(page.getByText('🖼️ Galeriye Kaydedildi!')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Galerim', exact: true }).click();
  const gallery = page.getByRole('dialog', { name: 'Çizim Galerim' });
  const image = gallery.getByRole('img', { name: /^Çizim / });
  await expect(image).toHaveCount(1);
  await expect(image).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('gallery.png') });
  await gallery.getByRole('button', { name: /çizimini aç$/ }).click();
  await expect(page.getByRole('dialog', { name: 'Çizim önizlemesi' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Çizim önizlemesi' })).toHaveCount(0);
  await gallery.getByRole('button', { name: /çizimini sil$/ }).click();
  await expect(image).toHaveCount(1);
  await gallery.getByRole('button', { name: /silmeyi onayla$/ }).click();
  await expect(gallery.getByText('Henüz çizim yok!')).toBeVisible();
});

test('route HTML includes metadata before JavaScript runs', async ({ request }) => {
  const response = await request.get('/games/math/');
  const html = await response.text();
  expect(html).toContain('<title>Matematik');
  expect(html).toContain('https://oyuncak.app/games/math');
});

test('muting inside a game updates the menu sound control', async ({ page }) => {
  await page.goto('/games/math');
  await page.getByRole('button', { name: 'Oyun sesini kapat' }).click();
  await expect(page.getByRole('button', { name: 'Oyun sesini aç' })).toBeVisible();
  await page.getByRole('button', { name: 'Oyunlara Dön' }).click();
  await expect(page.getByRole('button', { name: 'Sesi aç', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Sesi aç', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sesi kapat', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('corrupt legacy drawings preserve gallery access and offer a backup', async ({ page }) => {
  await page.goto('/draw');
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(page.getByText('🖼️ Galeriye Kaydedildi!')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('oyuncak-drawings', '{broken-json'));
  await page.reload();
  await page.getByRole('button', { name: 'Galerim', exact: true }).click();
  const gallery = page.getByRole('dialog', { name: 'Çizim Galerim' });
  await expect(gallery.getByRole('img', { name: /^Çizim / })).toBeVisible();
  await expect(gallery.getByRole('status')).toContainText('Eski kayıtların yedeği korunuyor.');
  const downloading = page.waitForEvent('download');
  await gallery.getByRole('button', { name: 'Eski kayıtların yedeğini indir' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('oyuncak-eski-cizimler-yedek.json');
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString()).toBe('{broken-json');
});
