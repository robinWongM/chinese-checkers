export enum Player {
  NONE = 0,
  NORTH = 1,      // North (Red)
  NORTH_EAST = 2, // North-East (Green)
  SOUTH_EAST = 3, // South-East (Orange)
  SOUTH = 4,      // South (Blue)
  SOUTH_WEST = 5, // South-West (Purple)
  NORTH_WEST = 6  // North-West (Pink)
}

export interface HexPosition {
  q: number;  // Column in cube coordinates
  r: number;  // Row in cube coordinates
  s: number;  // Derived: q + r + s = 0
}

export interface BoardPosition extends HexPosition {
  player: Player;
  corner?: Player; // Which corner this position belongs to (if any)
}

export interface GameConfig {
  playerCount: number; // 2-6
  activePlayers: Player[]; // Which corners are active, in turn order
}

export interface GameState {
  config: GameConfig;
  currentPlayer: Player;
  currentPlayerIndex: number;
  board: Map<string, BoardPosition>;
  selectedPosition: HexPosition | null;
  validMoves: HexPosition[];
  winner: Player | null;
}

// Utility functions for player information
export const PlayerInfo = {
  getName: (player: Player): string => {
    switch (player) {
      case Player.NORTH: return 'North';
      case Player.NORTH_EAST: return 'North-East';
      case Player.SOUTH_EAST: return 'South-East';
      case Player.SOUTH: return 'South';
      case Player.SOUTH_WEST: return 'South-West';
      case Player.NORTH_WEST: return 'North-West';
      default: return 'None';
    }
  },
  
  getColor: (player: Player): number => {
    switch (player) {
      case Player.NORTH: return 0xEF4444; // Red
      case Player.NORTH_EAST: return 0x10B981; // Green
      case Player.SOUTH_EAST: return 0xF59E0B; // Orange
      case Player.SOUTH: return 0x3B82F6; // Blue
      case Player.SOUTH_WEST: return 0x8B5CF6; // Purple
      case Player.NORTH_WEST: return 0xEC4899; // Pink
      default: return 0x9CA3AF; // Gray
    }
  },
  
  getOppositeCorner: (player: Player): Player => {
    switch (player) {
      case Player.NORTH: return Player.SOUTH;
      case Player.NORTH_EAST: return Player.SOUTH_WEST;
      case Player.SOUTH_EAST: return Player.NORTH_WEST;
      case Player.SOUTH: return Player.NORTH;
      case Player.SOUTH_WEST: return Player.NORTH_EAST;
      case Player.NORTH_WEST: return Player.SOUTH_EAST;
      default: return Player.NONE;
    }
  }
};
