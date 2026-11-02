import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadTsModule } from "./helpers/load-ts-module.mjs";

function sortValues(values) {
  return [...new Set(values)].sort();
}

function extractMatches(source, pattern) {
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

export async function run() {
  const root = process.cwd();
  const [{ GAME_ROUTE_IDS, ALL_GAME_IDS }, gamesMenuSource] = await Promise.all([
    loadTsModule("src/constants/gameIds.ts"),
    readFile(path.join(root, "src/components/games/GamesMenu.tsx"), "utf8"),
  ]);

  assert.ok(Array.isArray(GAME_ROUTE_IDS), "GAME_ROUTE_IDS tanımlı olmalı");
  assert.ok(Array.isArray(ALL_GAME_IDS), "ALL_GAME_IDS tanımlı olmalı");

  const { GAME_CATALOG } = await loadTsModule('src/data/gameCatalog.ts');
  const menuRouteIds = GAME_CATALOG.map((game) => game.id);
  assert.match(gamesMenuSource, /GAME_CATALOG/);
  assert.equal(new Set(menuRouteIds).size, menuRouteIds.length);
  for (const game of GAME_CATALOG) {
    await readFile(path.join(root, 'src/components/games', `${game.component}.tsx`));
    assert.ok(game.minAge >= 4 && game.duration && game.skill);
  }
  assert.deepEqual(
    sortValues(menuRouteIds),
    sortValues(GAME_ROUTE_IDS),
    "GamesMenu rota ID'leri ortak sözlük ile aynı olmalı",
  );

  const scoreIdSources = await Promise.all(
    [
      "src/components/games/BalloonPopGame.tsx",
      "src/components/games/WhackAMoleGame.tsx",
      "src/components/games/OddOneOutGame.tsx",
      "src/components/games/MemoryFlipGame.tsx",
      "src/components/games/RunnerGame.tsx",
      "src/components/games/SnakeGame.tsx",
      "src/components/games/TetrisGame.tsx",
      "src/components/games/BasketballGame.tsx",
      "src/components/games/PianoGame.tsx",
      "src/components/games/MathGame.tsx",
      "src/components/games/CountingGame.tsx",
      "src/components/games/ShapeMatchGame.tsx",
      "src/components/games/SimonSaysGame.tsx",
      "src/components/games/CodingTurtleGame.tsx",
      "src/components/games/SpaceShooterGame.tsx",
      "src/components/games/Game2048.tsx",
    ].map((relativePath) => readFile(path.join(root, relativePath), "utf8")),
  );

  const scoreIds = sortValues(
    scoreIdSources.flatMap((source) => [
      ...extractMatches(source, /Leaderboard gameId="([^"]+)"/g),
      ...extractMatches(source, /getHighScore\('([^']+)'\)/g),
      ...extractMatches(source, /saveHighScoreObj\('([^']+)'\)/g),
    ]),
  );

  for (const scoreId of scoreIds) {
    assert.ok(
      ALL_GAME_IDS.includes(scoreId),
      `Skor kimliği ortak skor sözlüğünde tanımlı değil: ${scoreId}`,
    );
  }

  // Sunucu doğrulaması ve Firestore kuralı da aynı listeyi taşır; biri
  // güncellenmezse yeni oyun sessizce reddedilir. İkisini de karşılaştır.
  const scoreValidationSource = await readFile(
    path.join(root, "functions/scoreValidation.js"),
    "utf8",
  );
  const validationBlock = scoreValidationSource.match(/SCORE_GAME_IDS = new Set\(\[[\s\S]*?\]\)/);
  assert.ok(validationBlock, "functions/scoreValidation.js SCORE_GAME_IDS bulunmalı");
  const validationIds = extractMatches(validationBlock[0], /'([a-z0-9-]+)'/g);
  assert.deepEqual(
    sortValues(validationIds),
    sortValues(ALL_GAME_IDS),
    "functions/scoreValidation.js skor ID'leri ortak sözlük ile aynı olmalı",
  );

  const rulesSource = await readFile(path.join(root, "firestore.rules"), "utf8");
  const supportedBlock = rulesSource.match(/function isSupportedGame[\s\S]*?\];/);
  assert.ok(supportedBlock, "firestore.rules isSupportedGame bulunmalı");
  const ruleIds = extractMatches(supportedBlock[0], /'([a-z0-9-]+)'/g);
  assert.deepEqual(
    sortValues(ruleIds),
    sortValues(ALL_GAME_IDS),
    "firestore.rules oyun ID'leri ortak sözlük ile aynı olmalı",
  );
}

export default run;
