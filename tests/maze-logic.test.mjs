import assert from "node:assert/strict";
import { loadTsModule } from "./helpers/load-ts-module.mjs";

export async function run() {
  const {
    generateMaze,
    carveLoops,
    bfsDistances,
    isSolvable,
    farthestCell,
    pickCollectibles,
    planMazeMove,
    revealAround,
    levelConfig,
    cellIndex,
    isWall,
    MAX_LEVEL,
  } = await loadTsModule("src/components/games/mazeLogic.ts");

  // ── Üretim: kenarlık duvar, geçitler tek sayılı koordinatlarda ──
  const maze = generateMaze(11, 11, 7);
  assert.equal(maze.cols, 11, "tek boyut korunur");
  assert.equal(maze.rows, 11, "tek boyut korunur");
  assert.equal(maze.cells.length, 121, "hücre sayısı boyutlarla uyuşur");
  for (let x = 0; x < maze.cols; x += 1) {
    assert.equal(isWall(maze, { x, y: 0 }), true, "üst kenar duvardır");
    assert.equal(isWall(maze, { x, y: maze.rows - 1 }), true, "alt kenar duvardır");
  }
  for (let y = 0; y < maze.rows; y += 1) {
    assert.equal(isWall(maze, { x: 0, y }), true, "sol kenar duvardır");
    assert.equal(isWall(maze, { x: maze.cols - 1, y }), true, "sağ kenar duvardır");
  }

  // ── Aynı tohum aynı labirenti verir, farklı tohum vermez ──
  assert.deepEqual(generateMaze(11, 11, 7).cells, maze.cells, "üretim deterministiktir");
  assert.notDeepEqual(generateMaze(11, 11, 8).cells, maze.cells, "tohum sonucu değiştirir");

  // ── Çift boyut tek sayıya yuvarlanır ──
  const evenMaze = generateMaze(10, 10, 3);
  assert.equal(evenMaze.cols % 2, 1, "çift genişlik tek sayıya yuvarlanır");
  assert.equal(evenMaze.rows % 2, 1, "çift yükseklik tek sayıya yuvarlanır");

  // ── Kusursuz labirentte her geçit başlangıçtan erişilebilir ──
  const start = { x: 1, y: 1 };
  const distances = bfsDistances(maze, start);
  let floors = 0;
  for (let index = 0; index < maze.cells.length; index += 1) {
    if (maze.cells[index] === 0) {
      floors += 1;
      assert.ok(distances[index] >= 0, "her geçit başlangıçtan erişilebilir");
    }
  }
  assert.ok(floors > 10, "labirent yeterli geçit içerir");

  // ── En uzak hücre gerçekten en uzaktır ve çözülebilirdir ──
  const exit = farthestCell(maze, start);
  assert.ok(distances[cellIndex(maze, exit)] > 0, "çıkış başlangıçtan uzaktır");
  assert.equal(isSolvable(maze, start, exit), true, "çıkış çözülebilir olmalı");
  assert.equal(isSolvable(maze, start, { x: 0, y: 0 }), false, "duvar çözülemez");

  // ── Döngü açma geçit sayısını artırır, duvarı geçide çevirir ──
  const looped = carveLoops(maze, 5, 11);
  const loopedFloors = looped.cells.filter((cell) => cell === 0).length;
  assert.ok(loopedFloors > floors, "döngü açma yeni geçit ekler");
  assert.equal(looped.cols, maze.cols, "döngü açma boyutu korur");
  assert.deepEqual(maze.cells.filter((cell) => cell === 0).length, floors, "girdi labirenti değişmez");

  // ── Toplanacaklar: adet, benzersizlik, başlangıç ve çıkış hariç ──
  const stars = pickCollectibles(maze, start, exit, 4, 21);
  assert.equal(stars.length, 4, "istenen sayıda yıldız seçilir");
  const uniqueKeys = new Set(stars.map((point) => `${point.x},${point.y}`));
  assert.equal(uniqueKeys.size, 4, "yıldızlar benzersizdir");
  for (const star of stars) {
    assert.equal(isWall(maze, star), false, "yıldız geçitte durur");
    assert.ok(!(star.x === exit.x && star.y === exit.y), "yıldız çıkışa konmaz");
    assert.ok(!(star.x === start.x && star.y === start.y), "yıldız başlangıca konmaz");
  }
  assert.deepEqual(
    pickCollectibles(maze, start, exit, 4, 21),
    stars,
    "yıldız seçimi deterministiktir",
  );
  assert.equal(pickCollectibles(maze, start, exit, 0, 21).length, 0, "sıfır istek boş döner");

  // ── Hareket: duvar engeller, geçit ilerletir, girdi değişmez ──
  const openMaze = { cols: 3, rows: 3, cells: [1, 1, 1, 1, 0, 1, 1, 1, 1] };
  const center = { x: 1, y: 1 };
  assert.deepEqual(planMazeMove(openMaze, center, "UP"), { pos: { x: 1, y: 1 }, blocked: true });
  const corridor = { cols: 3, rows: 1, cells: [0, 0, 0] };
  const moved = planMazeMove(corridor, { x: 1, y: 0 }, "RIGHT");
  assert.deepEqual(moved.pos, { x: 2, y: 0 }, "geçit ilerletir");
  assert.equal(moved.blocked, false);
  assert.deepEqual(planMazeMove(corridor, { x: 2, y: 0 }, "RIGHT").blocked, true, "kenarlık engeller");
  const anchor = { x: 0, y: 0 };
  planMazeMove(corridor, anchor, "LEFT");
  assert.deepEqual(anchor, { x: 0, y: 0 }, "girdi noktası değişmez");

  // ── Keşif sisi: kendi hücresi ve açık komşuları ──
  const revealed = revealAround(openMaze, center);
  assert.deepEqual(revealed, [4], "kapalı komşular açılmaz");
  assert.equal(revealAround(corridor, { x: 1, y: 0 }).length, 3, "açık komşular eklenir");

  // ── Seviye eğrisi: büyür, süre kısalır, üst sınırda durur ──
  assert.ok(levelConfig(1).cols < levelConfig(5).cols, "seviye büyüdükçe alan büyür");
  assert.ok(levelConfig(1).seconds > levelConfig(5).seconds, "seviye büyüdükçe süre kısalır");
  assert.equal(levelConfig(0).cols, levelConfig(1).cols, "sıfır seviye birinci seviye sayılır");
  assert.ok(levelConfig(99).cols <= 17, "alan üst sınırı aşmaz");
  assert.ok(levelConfig(99).stars <= 8, "yıldız üst sınırı aşmaz");
  assert.ok(levelConfig(99).seconds >= 24, "süre alt sınıra iner");
  assert.equal(MAX_LEVEL, 5, "seviye sayısı sabittir");
}
