export type ConnectFourCell = 0 | 1 | 2;

export interface ConnectFourCoordinate {
  row: number;
  column: number;
}

export interface ConnectFourResult {
  winner: ConnectFourCell;
  line: ConnectFourCoordinate[];
}

const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]] as const;

export function findConnectFourResult(board: ConnectFourCell[][]): ConnectFourResult {
  for (let row = 0; row < board.length; row += 1) {
    for (let column = 0; column < board[row].length; column += 1) {
      const player = board[row][column];
      if (!player) continue;

      for (const [rowStep, columnStep] of DIRECTIONS) {
        const line = Array.from({ length: 4 }, (_, offset) => ({
          row: row + rowStep * offset,
          column: column + columnStep * offset,
        }));
        if (line.every((cell) => board[cell.row]?.[cell.column] === player)) {
          return { winner: player, line };
        }
      }
    }
  }
  return { winner: 0, line: [] };
}

export function describeConnectFourLine(line: ConnectFourCoordinate[], winner: ConnectFourCell): string {
  if (line.length !== 4 || winner === 0) return 'Tahtada dörtleme oluşmadı.';
  const owner = winner === 2 ? 'Bilgisayar' : 'Sen';
  const verb = winner === 2 ? 'yaptı' : 'yaptın';
  if (line.every((cell) => cell.column === line[0].column)) {
    return `${owner} ${line[0].column + 1}. sütunda dikey dörtleme ${verb}.`;
  }
  if (line.every((cell) => cell.row === line[0].row)) {
    return `${owner} ${line[0].row + 1}. satırda yatay dörtleme ${verb}.`;
  }
  const direction = line[3].column > line[0].column ? 'sol üstten sağ alta' : 'sağ üstten sol alta';
  return `${owner} ${direction} çapraz dörtleme ${verb}.`;
}
