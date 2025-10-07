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
  isStartZone1: boolean; // South - Player 1 (Blue)
  isStartZone2: boolean; // North - Player 2 (Red)
  isGoalZone1: boolean;
  isGoalZone2: boolean;
  isCornerNE?: boolean; // North-East
  isCornerSE?: boolean; // South-East
  isCornerSW?: boolean; // South-West
  isCornerNW?: boolean; // North-West
}

export interface GameState {
  currentPlayer: Player;
  board: Map<string, BoardPosition>;
  selectedPosition: HexPosition | null;
  validMoves: HexPosition[];
  winner: Player | null;
}
