import type { AIType, GameConfig, PlayerConfig } from '../types';
import { Player } from '../types';
import { DEFAULT_2_PLAYER_CONFIG, PRESET_CONFIGS } from './gameConfig';

export type GameMode = 'ai' | 'multiplayer';
export type PlayerType = 'human' | 'ai';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameSetupOptions {
  mode?: GameMode;
  playerCount?: number;
  playerTypes?: PlayerType[];
  aiDifficulty?: Difficulty;
  aiType?: AIType;
  gameConfig?: GameConfig;
  multiplayerConfig?: PlayerType[];
}

export interface GameLaunchSettings {
  mode: GameMode;
  playerCount: number;
  playerTypes: PlayerType[];
  aiDifficulty: Difficulty;
  aiType: AIType;
  gameConfig: GameConfig;
}

const DEFAULT_DIFFICULTY: Difficulty = 'medium';
const DEFAULT_AI_TYPE: AIType = 'greedy';

export const normalizeGameConfig = (
  config: GameConfig,
  fallbackDifficulty: Difficulty = DEFAULT_DIFFICULTY,
  fallbackAIType: AIType = DEFAULT_AI_TYPE
): GameConfig => {
  const activePlayers = [...config.activePlayers];
  const playerConfigs: PlayerConfig[] = activePlayers.map((player) => {
    const existing = config.playerConfigs?.find((pc) => pc.player === player);
    if (existing?.isAI) {
      return {
        player,
        isAI: true,
        aiType: existing.aiType ?? fallbackAIType,
        aiDifficulty: existing.aiDifficulty ?? fallbackDifficulty
      };
    }
    return {
      player,
      isAI: false
    };
  });

  return {
    playerCount: activePlayers.length,
    activePlayers,
    playerConfigs
  };
};

const clampPlayerCount = (count?: number): number => {
  if (!count || count < 2) {
    return DEFAULT_2_PLAYER_CONFIG.playerCount;
  }
  if (count === 5) {
    return 6;
  }
  return Math.min(6, Math.max(2, count));
};

const resolvePlayerTypes = (
  mode: GameMode,
  playerCount: number,
  rawTypes: PlayerType[] = []
): PlayerType[] => {
  if (mode === 'ai') {
    return ['human', 'ai'];
  }

  const sanitized: PlayerType[] = [];
  for (let i = 0; i < playerCount; i++) {
    sanitized[i] = rawTypes[i] ?? 'human';
  }
  return sanitized;
};

export const buildMultiplayerConfig = (
  playerTypes: PlayerType[] = [],
  count?: number,
  difficulty: Difficulty = DEFAULT_DIFFICULTY,
  aiType: AIType = DEFAULT_AI_TYPE
): GameConfig => {
  const desiredCount = clampPlayerCount(
    count && count > 0 ? count : playerTypes.length > 0 ? playerTypes.length : undefined
  );

  const preset =
    PRESET_CONFIGS[desiredCount] ??
    PRESET_CONFIGS[playerTypes.length] ??
    DEFAULT_2_PLAYER_CONFIG;

  const activePlayers = [...preset.activePlayers].slice(0, desiredCount);
  const playerConfigs: PlayerConfig[] = activePlayers.map((player, index) => {
    const type = playerTypes[index] ?? 'human';
    const isAI = type === 'ai';
    return {
      player,
      isAI,
      ...(isAI ? { aiType, aiDifficulty: difficulty } : {})
    };
  });

  return {
    playerCount: activePlayers.length,
    activePlayers,
    playerConfigs
  };
};

export const buildAIConfig = (options: {
  aiDifficulty?: Difficulty;
  aiType?: AIType;
} = {}): GameConfig => {
  const aiDifficulty = options.aiDifficulty ?? DEFAULT_DIFFICULTY;
  const aiType = options.aiType ?? DEFAULT_AI_TYPE;

  return {
    playerCount: 2,
    activePlayers: [Player.SOUTH, Player.NORTH],
    playerConfigs: [
      { player: Player.SOUTH, isAI: false },
      { player: Player.NORTH, isAI: true, aiType, aiDifficulty }
    ]
  };
};

export const resolveGameConfig = (setup: GameSetupOptions | null | undefined): GameConfig => {
  if (!setup) {
    return normalizeGameConfig(DEFAULT_2_PLAYER_CONFIG);
  }

  const fallbackDifficulty = setup.aiDifficulty ?? DEFAULT_DIFFICULTY;
  const fallbackAIType = setup.aiType ?? DEFAULT_AI_TYPE;

  if (setup.gameConfig) {
    return normalizeGameConfig(setup.gameConfig, fallbackDifficulty, fallbackAIType);
  }

  const typeList = setup.multiplayerConfig ?? setup.playerTypes;

  if ((setup.mode === 'multiplayer' || Array.isArray(typeList)) && typeList) {
    return buildMultiplayerConfig(typeList, setup.playerCount, fallbackDifficulty, fallbackAIType);
  }

  if (setup.mode === 'ai') {
    return buildAIConfig({ aiDifficulty: fallbackDifficulty, aiType: fallbackAIType });
  }

  return normalizeGameConfig(DEFAULT_2_PLAYER_CONFIG, fallbackDifficulty, fallbackAIType);
};

export const createLaunchSettings = (
  raw: GameSetupOptions | null | undefined
): GameLaunchSettings => {
  const mode: GameMode = raw?.mode ?? 'multiplayer';
  const aiDifficulty = raw?.aiDifficulty ?? DEFAULT_DIFFICULTY;
  const aiType = raw?.aiType ?? DEFAULT_AI_TYPE;

  const playerCount =
    mode === 'ai'
      ? 2
      : clampPlayerCount(
          raw?.playerCount ??
            raw?.gameConfig?.playerCount ??
            raw?.multiplayerConfig?.length ??
            raw?.playerTypes?.length ??
            DEFAULT_2_PLAYER_CONFIG.playerCount
        );

  const playerTypes = resolvePlayerTypes(mode, playerCount, raw?.playerTypes);

  const gameConfig =
    mode === 'ai'
      ? buildAIConfig({ aiDifficulty, aiType })
      : buildMultiplayerConfig(playerTypes, playerCount, aiDifficulty, aiType);

  return {
    mode,
    playerCount: gameConfig.playerCount,
    playerTypes,
    aiDifficulty,
    aiType,
    gameConfig
  };
};
