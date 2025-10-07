export enum Player {
  NONE = 0,
  PLAYER1 = 1,
  PLAYER2 = 2
}

export interface HexPosition {
  q: number;  // Column in cube coordinates
  r: number;  // Row in cube coordinates
  s: number;  // Derived: q + r + s = 0
}

export interface BoardPosition extends HexPosition {
  player: Player;
  isStartZone1: boolean;
  isStartZone2: boolean;
  isGoalZone1: boolean;
  isGoalZone2: boolean;
}

export interface GameState {
  currentPlayer: Player;
  board: Map<string, BoardPosition>;
  selectedPosition: HexPosition | null;
  validMoves: HexPosition[];
  winner: Player | null;
}
