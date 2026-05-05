import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

/**
 * Maskable PWA icon generator.
 *
 * - Output: 512×512 PNG
 * - Theme background: #0f1219 (matches manifest theme_color)
 * - Safe zone: %80 (icon is scaled to 410×410 and centered)
 *   → Android adaptive launcher kırpsa bile logo tamamen görünür kalır.
 *
 * Çalıştırmak için: node scripts/generate-maskable-icon.mjs
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "public", "favicon.png");
const OUT_512 = path.join(ROOT, "public", "maskable-icon-512.png");
const OUT_192 = path.join(ROOT, "public", "maskable-icon-192.png");

const BG = { r: 0x0f, g: 0x12, b: 0x19, alpha: 1 };
const SAFE_ZONE = 0.8;

async function generate(size, outPath) {
  const inner = Math.round(size * SAFE_ZONE);
  const padding = Math.round((size - inner) / 2);

  const resized = await sharp(SOURCE)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: resized, top: padding, left: padding }])
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(outPath);

  const stat = await fs.stat(outPath);
  console.log(`✓ ${path.basename(outPath)}  (${size}×${size}, ${(stat.size / 1024).toFixed(1)} KB)`);
}

await generate(512, OUT_512);
await generate(192, OUT_192);
console.log("Maskable icons hazır.");
