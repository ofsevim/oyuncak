export type TetrisBoard = (string | null)[][];
export function collides(
  board: TetrisBoard,
  x: number,
  y: number,
  shape: number[][],
): boolean {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = x + c,
        ny = y + r;
      if (nx < 0 || nx >= board[0].length || ny >= board.length) return true;
      if (ny >= 0 && board[ny][nx] !== null) return true;
    }
  return false;
}
export interface HoldInput<T extends string> {
  currentType: T;
  heldType: T | null;
  nextType: T;
  canHold: boolean;
  board: TetrisBoard;
  shapes: Record<T, number[][]>;
}
export function planHoldTransition<T extends string>(input: HoldInput<T>) {
  if (!input.canHold) return null;
  const type = input.heldType ?? input.nextType;
  const shape = input.shapes[type];
  const pos = {
    x: Math.floor(input.board[0].length / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
  return {
    active: { type, shape, pos },
    heldType: input.currentType,
    consumeNext: input.heldType === null,
    canHold: false,
    blocked: collides(input.board, pos.x, 0, shape),
  };
}
