import { GameConfig, Player } from '../types';

// Default 2-player configuration (South vs North)
export const DEFAULT_2_PLAYER_CONFIG: GameConfig = {
  playerCount: 2,
  activePlayers: [Player.SOUTH, Player.NORTH]
};

// 2-player with AI opponent configuration
export const PLAYER_VS_AI_CONFIG: GameConfig = {
  playerCount: 2,
  activePlayers: [Player.SOUTH, Player.NORTH],
  playerConfigs: [
    { player: Player.SOUTH, isAI: false },
    { player: Player.NORTH, isAI: true, aiType: 'greedy', aiDifficulty: 'medium' }
  ]
};

// Preset configurations
export const PRESET_CONFIGS: Record<number, GameConfig> = {
  2: DEFAULT_2_PLAYER_CONFIG,
  3: {
    playerCount: 3,
    activePlayers: [Player.NORTH, Player.SOUTH_EAST, Player.SOUTH_WEST]
  },
  4: {
    playerCount: 4,
    activePlayers: [Player.NORTH, Player.SOUTH_EAST, Player.SOUTH, Player.NORTH_WEST]
  },
  6: {
    playerCount: 6,
    activePlayers: [Player.NORTH, Player.NORTH_EAST, Player.SOUTH_EAST, Player.SOUTH, Player.SOUTH_WEST, Player.NORTH_WEST]
  }
};
