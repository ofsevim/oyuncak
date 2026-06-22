import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadTsModule } from "./helpers/load-ts-module.mjs";

export async function run() {
  const root = process.cwd();
  const [{ SCORE_GAME_IDS }, rules] = await Promise.all([
    loadTsModule("src/constants/gameIds.ts"),
    readFile(path.join(root, "firestore.rules"), "utf8"),
  ]);

  assert.match(
    rules,
    /function\s+isKnownScoreGame\s*\(\s*gameId\s*\)/,
    "Firestore rules oyun kimliği whitelist fonksiyonu içermeli",
  );
  assert.match(
    rules,
    /&&\s*isKnownScoreGame\(gameId\)/,
    "Skor yazma kuralı bilinen oyun kimliği kontrolünü çağırmalı",
  );

  for (const gameId of SCORE_GAME_IDS) {
    assert.match(
      rules,
      new RegExp(`'${gameId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`),
      `Firestore whitelist SCORE_GAME_IDS değerini içermiyor: ${gameId}`,
    );
  }
}

export default run;
