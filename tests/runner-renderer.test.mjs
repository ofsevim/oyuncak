import assert from "node:assert/strict";
import { loadTsModule } from "./helpers/load-ts-module.mjs";
export async function run() {
  const { drawRunnerFrame } = await loadTsModule(
    "src/components/games/runner/runnerRenderer.ts",
  );
  const { CHARACTERS } = await loadTsModule(
    "src/components/games/runner/runnerRuntime.ts",
  );
  const commands = [];
  const gradient = {
    addColorStop: (...args) => commands.push(["stop", ...args]),
  };
  const ctx = new Proxy(
    {},
    {
      get: (_, key) =>
        key === "createLinearGradient" || key === "createRadialGradient"
          ? () => gradient
          : (...args) => commands.push([key, ...args]),
      set: (_, key, value) => {
        commands.push([key, value]);
        return true;
      },
    },
  );
  const cache = {
    body: new Map(),
    mountains: [],
    groundTexW: 900,
    grassW: 900,
    groundTexture: {},
    grass: {},
    sun: {},
    vignette: gradient,
  };
  const player = {
    x: 90,
    y: 290,
    vy: 0,
    w: 46,
    h: 54,
    grounded: true,
    jumps: 0,
    squash: 1,
    stretch: 1,
    landTimer: 0,
  };
  for (const character of CHARACTERS) {
    const snapshot = {
      cache,
      player,
      character,
      frame: 13500,
      groundOffset: 0,
      happyTimer: 0,
      invincible: false,
      magnet: false,
      rocket: false,
      shield: false,
      speed: 5,
      obstacles: [],
      collectibles: [],
      particles: [],
      floatingTexts: [],
      milestone: null,
    };
    const before = JSON.stringify(player);
    assert.equal(
      drawRunnerFrame(ctx, snapshot),
      cache,
      "render cache must be reused",
    );
    assert.equal(
      JSON.stringify(player),
      before,
      "rendering must not mutate physics state",
    );
  }
  assert.ok(commands.some(([op]) => op === "clearRect"));
  assert.ok(
    commands.some(([op]) => op === "arc"),
    "renderer must draw the scene, not just return cache",
  );
}
