export interface SnakePoint {
  x: number;
  y: number;
}
export type SnakeDirection = "UP" | "DOWN" | "LEFT" | "RIGHT";
export function planSnakeStep(
  snake: SnakePoint[],
  direction: SnakeDirection,
  food: SnakePoint,
  obstacles: SnakePoint[],
  size: number,
  wrap: boolean,
) {
  const head = { ...snake[0] };
  if (direction === "UP") head.y--;
  if (direction === "DOWN") head.y++;
  if (direction === "LEFT") head.x--;
  if (direction === "RIGHT") head.x++;
  if (wrap) {
    head.x = (head.x + size) % size;
    head.y = (head.y + size) % size;
  }
  const same = (p: SnakePoint) => p.x === head.x && p.y === head.y;
  const ate = same(food);
  const collision =
    head.x < 0 ||
    head.y < 0 ||
    head.x >= size ||
    head.y >= size ||
    (ate ? snake : snake.slice(0, -1)).some(same) ||
    obstacles.some(same);
  const next = [head, ...snake];
  if (!ate) next.pop();
  return { snake: next, ate, collision };
}
