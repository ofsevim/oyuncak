import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * .env.example, env.ts içinde REQUIRED olarak işaretlenen tüm değişkenleri
 * kapsamalı — yoksa yeni geliştiriciler konfigürasyonu tamamlayamaz.
 */
export async function run() {
  const root = process.cwd();
  const example = await readFile(path.join(root, ".env.example"), "utf8");
  const envSource = await readFile(path.join(root, "src/lib/envKeys.ts"), "utf8");

  const required = [...envSource.matchAll(/['"](VITE_[A-Z0-9_]+)['"]/g)].map((m) => m[1]);
  const uniqueRequired = Array.from(new Set(required));

  assert.equal(uniqueRequired.length, 6);
  for (const key of uniqueRequired) {
    assert.match(
      example,
      new RegExp(`^${key}=`, "m"),
      `.env.example içinde ${key} yok`
    );
  }
}

export default run;
