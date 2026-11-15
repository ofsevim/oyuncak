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
  const bootstrap = await readFile(
    path.join(root, "public/games/battlecity/src/bootstrap.js"),
    "utf8",
  );
  assert.match(
    bootstrap,
    /postMessage\(\s*\{\s*type:\s*'battlecity:gameover'/,
    "Battle City skor postMessage köprüsü eksik",
  );

  // React bileşeni güvenilir köprüyü kullanmalı, skoru kaydetmeli ve Leaderboard göstermeli
  const tsx = await readFile(
    path.join(root, "src/components/games/BattleCityGame.tsx"),
    "utf8",
  );
  assert.match(tsx, /extractBattleCityGameOverScore\(/, "BattleCityGame skor mesajı ayrıştırıcısını kullanmıyor");
  assert.match(tsx, /isTrustedBattleCityMessage\(/, "BattleCityGame kaynak/origin doğrulaması yapmıyor");
  assert.match(tsx, /checkAndSave\(/, "BattleCityGame skoru kaydetmiyor");
  assert.match(tsx, /<Leaderboard\s+gameId=\{GAME_ID\}/, "BattleCityGame liderlik tablosu render etmiyor");

  const { extractBattleCityGameOverScore, isTrustedBattleCityMessage } = await loadTsModule(
    'src/components/games/battleCityLogic.ts',
  );
  assert.equal(extractBattleCityGameOverScore({ type: 'battlecity:gameover', score: 1500 }), 1500);
  assert.equal(extractBattleCityGameOverScore({ type: 'battlecity:gameover', score: 42.9 }), 42);
  assert.equal(extractBattleCityGameOverScore({ type: 'battlecity:gameover', score: 0 }), null);
  assert.equal(extractBattleCityGameOverScore({ type: 'battlecity:gameover', score: -10 }), null);
  assert.equal(extractBattleCityGameOverScore({ type: 'battlecity:gameover', score: NaN }), null);
  assert.equal(extractBattleCityGameOverScore({ type: 'other', score: 500 }), null);
  const iframeWin = { id: 'iframe' };
  const otherWin = { id: 'other' };
  assert.equal(isTrustedBattleCityMessage(iframeWin, iframeWin, 'https://oyuncak.app', 'https://oyuncak.app'), true);
  assert.equal(isTrustedBattleCityMessage(otherWin, iframeWin, 'https://oyuncak.app', 'https://oyuncak.app'), false);
  assert.equal(isTrustedBattleCityMessage(iframeWin, iframeWin, 'https://evil.example', 'https://oyuncak.app'), false);

  const gameIdMatch = tsx.match(/const GAME_ID = '([^']+)'/);
  assert.ok(gameIdMatch, "BattleCityGame GAME_ID sabiti tanımlamıyor");
  assert.ok(
    SCORE_GAME_IDS.includes(gameIdMatch[1]),
    `BattleCityGame GAME_ID ('${gameIdMatch[1]}') SCORE_GAME_IDS'te tanımlı değil`,
  );
}

export default run;
