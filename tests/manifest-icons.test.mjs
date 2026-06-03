import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";

/**
 * manifest.json içinde bildirilen tüm ikon (ve shortcut ikon) dosyalarının
 * public/ altında gerçekten var olduğunu doğrular.
 * Yanlış/eksik ikon yolları PWA install ve mağaza listelemelerini bozar.
 */
export async function run() {
  const root = process.cwd();
  const manifest = JSON.parse(
    await readFile(path.join(root, "public/manifest.json"), "utf8"),
  );

  const srcs = new Set();

  for (const icon of manifest.icons ?? []) {
    assert.ok(icon.src, "ikon src eksik");
    assert.ok(icon.sizes, `ikon sizes eksik: ${icon.src}`);
    // Tek dosya birden çok boyutta bildirilmemeli (her giriş tek gerçek boyut)
    assert.ok(
      !/\s/.test(String(icon.sizes).trim()),
      `tek ikon birden çok boyut bildiriyor (ayrı dosyalar kullanın): ${icon.src} → ${icon.sizes}`,
    );
    srcs.add(icon.src);
  }

  for (const shortcut of manifest.shortcuts ?? []) {
    for (const icon of shortcut.icons ?? []) {
      if (icon.src) srcs.add(icon.src);
    }
  }

  assert.ok(srcs.size > 0, "manifest hiç ikon bildirmiyor");

  for (const src of srcs) {
    // src kök-mutlak ("/icon-192.png") → public/ altına eşle
    const rel = src.replace(/^\//, "");
    await access(path.join(root, "public", rel)).catch(() => {
      throw new Error(`manifest ikonu diskte yok: public/${rel}`);
    });
  }
}

export default run;
