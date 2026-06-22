import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadTsModule } from "./helpers/load-ts-module.mjs";

/**
 * Tank Arena skor/liderlik entegrasyonunun uçtan uca tutarlılığını kilitler:
 *   - SCORE_GAME_IDS benzersiz ve 'tank-arena' içeriyor
 *   - iframe oyunu skoru postMessage ile bildiriyor
 *   - React bileşeni mesajı dinleyip aynı GAME_ID ile kaydediyor + Leaderboard render ediyor
 */
export async function run() {
  const root = process.cwd();
  const { SCORE_GAME_IDS, GAME_ROUTE_IDS } = await loadTsModule("src/constants/gameIds.ts");

  // SCORE_GAME_IDS benzersiz olmalı
  assert.equal(
    new Set(SCORE_GAME_IDS).size,
    SCORE_GAME_IDS.length,
    "SCORE_GAME_IDS yinelenen kimlik içeriyor",
  );

  // tank-arena hem rota hem skor sözlüğünde olmalı
  assert.ok(GAME_ROUTE_IDS.includes("tank-arena"), "tank-arena GAME_ROUTE_IDS'te yok");
  assert.ok(SCORE_GAME_IDS.includes("tank-arena"), "tank-arena SCORE_GAME_IDS'te yok");

  // iframe oyunu skoru parent'a bildirmeli
  const html = await readFile(
    path.join(root, "public/games/battlecity/BattleCity.html"),
    "utf8",
  );
  assert.match(
    html,
    /postMessage\(\s*\{\s*type:\s*'battlecity:gameover'/,
    "BattleCity.html skor postMessage köprüsü eksik",
  );

  // React bileşeni mesajı dinleyip kaydetmeli ve Leaderboard göstermeli
  const tsx = await readFile(
    path.join(root, "src/components/games/BattleCityGame.tsx"),
    "utf8",
  );
  assert.match(tsx, /battlecity:gameover/, "BattleCityGame mesaj tipini dinlemiyor");
  assert.match(tsx, /checkAndSave\(/, "BattleCityGame skoru kaydetmiyor");
  assert.match(tsx, /<Leaderboard\s+gameId=\{GAME_ID\}/, "BattleCityGame liderlik tablosu render etmiyor");

  const gameIdMatch = tsx.match(/const GAME_ID = '([^']+)'/);
  assert.ok(gameIdMatch, "BattleCityGame GAME_ID sabiti tanımlamıyor");
  assert.ok(
    SCORE_GAME_IDS.includes(gameIdMatch[1]),
    `BattleCityGame GAME_ID ('${gameIdMatch[1]}') SCORE_GAME_IDS'te tanımlı değil`,
  );
}

export default run;
