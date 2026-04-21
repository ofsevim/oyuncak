import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";

/**
 * Üretim hazırlığı için kritik dosyaların varlığını ve temel içeriğini doğrular.
 * CI'da yanlışlıkla silinen SEO / PWA dosyalarını yakalar.
 */
export async function run() {
  const root = process.cwd();

  const requiredFiles = [
    "public/robots.txt",
    "public/sitemap.xml",
    "public/offline.html",
    "public/manifest.json",
    "public/sw.js",
    "public/favicon.png",
    "index.html",
    ".env.example",
  ];

  for (const rel of requiredFiles) {
    await access(path.join(root, rel));
  }

  // robots.txt sitemap referansı içermeli
  const robots = await readFile(path.join(root, "public/robots.txt"), "utf8");
  assert.match(robots, /Sitemap:\s*https?:\/\//, "robots.txt Sitemap satırı eksik");

  // sitemap.xml geçerli urlset olmalı
  const sitemap = await readFile(path.join(root, "public/sitemap.xml"), "utf8");
  assert.match(sitemap, /<urlset/, "sitemap.xml urlset etiketi eksik");
  assert.match(sitemap, /<loc>/, "sitemap.xml en az bir loc içermeli");

  // manifest temel alanları
  const manifest = JSON.parse(await readFile(path.join(root, "public/manifest.json"), "utf8"));
  assert.ok(manifest.name, "manifest.name eksik");
  assert.ok(manifest.start_url, "manifest.start_url eksik");
  assert.ok(manifest.icons?.length > 0, "manifest.icons eksik");

  // index.html kritik meta'lar
  const indexHtml = await readFile(path.join(root, "index.html"), "utf8");
  assert.match(indexHtml, /<meta\s+name=["']viewport["']/, "viewport meta eksik");
  assert.match(indexHtml, /rel=["']canonical["']/, "canonical link eksik");
  assert.match(indexHtml, /property=["']og:url["']/, "og:url eksik");
  assert.match(indexHtml, /application\/ld\+json/, "JSON-LD eksik");

  // viewport'ta user-scalable=no olmamalı (a11y)
  assert.doesNotMatch(indexHtml, /user-scalable=no/i, "user-scalable=no WCAG ihlali");
}

export default run;
