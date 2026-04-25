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
  const [{ GAME_ROUTE_IDS, FEATURED_GAME_ROUTE_IDS, ALL_GAME_IDS }, gamesMenuSource, featuredSource] = await Promise.all([
    loadTsModule("src/constants/gameIds.ts"),
    readFile(path.join(root, "src/components/games/GamesMenu.tsx"), "utf8"),
    readFile(path.join(root, "src/data/featured.ts"), "utf8"),
  ]);

  assert.ok(Array.isArray(GAME_ROUTE_IDS), "GAME_ROUTE_IDS tanımlı olmalı");
  assert.ok(Array.isArray(FEATURED_GAME_ROUTE_IDS), "FEATURED_GAME_ROUTE_IDS tanımlı olmalı");
  assert.ok(Array.isArray(ALL_GAME_IDS), "ALL_GAME_IDS tanımlı olmalı");

  const menuRouteIds = extractMatches(gamesMenuSource, /\{\s*id:\s*'([^']+)',\s*title:/g);
  const featuredRouteIds = extractMatches(featuredSource, /gameId:\s*"([^"]+)"/g);

  assert.deepEqual(
    sortValues(menuRouteIds),
    sortValues(GAME_ROUTE_IDS),
    "GamesMenu rota ID'leri ortak sözlük ile aynı olmalı",
  );

  assert.deepEqual(
    sortValues(featuredRouteIds),
    sortValues(FEATURED_GAME_ROUTE_IDS),
    "Öne çıkan oyun ID'leri ortak featured sözlüğü ile aynı olmalı",
  );

  for (const routeId of featuredRouteIds) {
    assert.ok(
      GAME_ROUTE_IDS.includes(routeId),
      `Öne çıkan kart geçersiz rota ID'si kullanıyor: ${routeId}`,
    );
  }

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
      "src/components/games/ComparisonGame.tsx",
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
}

export default run;
