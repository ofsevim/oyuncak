/**
 * Coloring PNG'lerini WebP'ye dönüştür + orijinal PNG'leri küçült.
 * Çalıştır: node scripts/optimize-coloring.mjs
 */
import sharp from 'sharp';
import { readdir, stat, rename } from 'fs/promises';
import { join } from 'path';

const DIR = join(import.meta.dirname, '..', 'public', 'coloring');
const MAX_DIM = 800; // Boyama sayfaları için yeterli

async function optimize() {
  const files = (await readdir(DIR)).filter(f => f.endsWith('.png'));
  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const src = join(DIR, file);
    const name = file.replace('.png', '');
    const webpOut = join(DIR, `${name}.webp`);
    const pngOptOut = join(DIR, `${name}.opt.png`);

    const before = (await stat(src)).size;
    totalBefore += before;

    // WebP dönüşümü
    await sharp(src)
      .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85, effort: 6 })
      .toFile(webpOut);

    // Optimize edilmiş PNG (WebP desteklemeyen tarayıcılar için)
    await sharp(src)
      .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true })
      .toFile(pngOptOut);

    const webpSize = (await stat(webpOut)).size;
    const pngOptSize = (await stat(pngOptOut)).size;
    totalAfter += webpSize;

    // Orijinal PNG'yi optimize edilmişle değiştir
    await rename(pngOptOut, src);

    console.log(
      `${file}: ${(before / 1024).toFixed(0)} KB → PNG ${(pngOptSize / 1024).toFixed(0)} KB | WebP ${(webpSize / 1024).toFixed(0)} KB`
    );
  }

  console.log('');
  console.log(`TOPLAM: ${(totalBefore / 1024).toFixed(0)} KB → ${(totalAfter / 1024).toFixed(0)} KB (WebP)`);
  console.log(`Kazanım: ${((1 - totalAfter / totalBefore) * 100).toFixed(1)}%`);
}

optimize().catch(err => {
  console.error('Optimizasyon hatası:', err);
  process.exit(1);
});
