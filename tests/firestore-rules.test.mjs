import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadTsModule } from "./helpers/load-ts-module.mjs";

export async function run() {
  const root = process.cwd();
  const [{ SCORE_GAME_IDS }, rules, scoreServiceSource] = await Promise.all([
    loadTsModule("src/constants/gameIds.ts"),
    readFile(path.join(root, "firestore.rules"), "utf8"),
    readFile(path.join(root, "src", "services", "scoreService.ts"), "utf8"),
  ]);

  assert.match(rules, /allow\s+read:\s*if\s+true/, "Liderlik tablosu okunabilir olmalı");
  assert.match(
    rules,
    /request\.auth\.uid\s*==\s*userId/,
    "Kullanıcı yalnızca kendi skor belgesini yazabilmeli",
  );
  assert.equal(SCORE_GAME_IDS.length, 21, "Skor oyun kimlikleri beklenmedik şekilde değişti");
  assert.match(
    rules,
    /request\.resource\.data\.score\s*>=\s*resource\.data\.score/,
    "Skor düşürülememeli",
  );
  assert.match(
    rules,
    /request\.resource\.data\.score\s*<=\s*9999999/,
    "Skor üst sınırı korunmalı",
  );
  assert.match(
    rules,
    /request\.resource\.data\.updatedAt\s*==\s*request\.time/,
    "Sunucu zamanı zorunlu olmalı",
  );
  assert.doesNotMatch(
    scoreServiceSource,
    /httpsCallable|firebase\/functions/,
    "Skor servisi Cloud Functions çağırmamalı",
  );
  assert.match(scoreServiceSource, /runTransaction/, "Yeni rekor atomik işlemle yazılmalı");
}

export default run;
