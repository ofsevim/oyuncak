import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadTsModule } from "./helpers/load-ts-module.mjs";

export async function run() {
  const root = process.cwd();
  const [{ SCORE_GAME_IDS }, rules, functionsSource, serverValidation] = await Promise.all([
    loadTsModule("src/constants/gameIds.ts"),
    readFile(path.join(root, "firestore.rules"), "utf8"),
    readFile(path.join(root, "functions", "index.js"), "utf8"),
    import("../functions/scoreValidation.js"),
  ]);

  assert.match(rules, /allow\s+read:\s*if\s+true/, "Liderlik tablosu okunabilir olmalı");
  assert.match(
    rules,
    /allow\s+write:\s*if\s+false/,
    "Skor belgelerine istemci tarafından doğrudan yazma kapatılmalı",
  );
  assert.equal(SCORE_GAME_IDS.length, 21, "Skor oyun kimlikleri beklenmedik şekilde değişti");
  assert.match(functionsSource, /export const submitScore = onCall/, "Sunucu skor fonksiyonu bulunmalı");
  assert.match(
    functionsSource,
    /https:\/\/adenerva\.netlify\.app/,
    "Canlı Netlify kaynağı callable CORS listesinde bulunmalı",
  );
  assert.match(functionsSource, /invoker:\s*'public'/, "Callable preflight herkese açık olmalı");

  assert.deepEqual(
    [...serverValidation.SCORE_GAME_IDS].sort(),
    [...SCORE_GAME_IDS].sort(),
    "İstemci ve sunucu skor oyun kimlikleri aynı olmalı",
  );
}

export default run;
