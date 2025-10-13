import type { GameLaunchSettings, GameMode, GameSetupOptions, Difficulty } from './setup';
import { createLaunchSettings } from './setup';
import type { AIType, GameConfig } from '../types';

export interface SessionMeta {
  mode: GameMode;
  playerCount: number;
  playerTypes: GameLaunchSettings['playerTypes'];
  aiDifficulty: Difficulty;
  aiType: AIType;
}

export class GameSession {
  private readonly launchSettings: GameLaunchSettings;
  private readonly initialConfig: GameConfig;

  private constructor(settings: GameLaunchSettings) {
    this.launchSettings = {
      ...settings,
      playerTypes: [...settings.playerTypes],
      gameConfig: GameSession.cloneConfig(settings.gameConfig)
    };
    this.initialConfig = GameSession.cloneConfig(settings.gameConfig);
  }

  static create(
    options?: GameLaunchSettings | GameSetupOptions | null | undefined
  ): GameSession {
    const settings =
      options && GameSession.isLaunchSettings(options)
        ? options
        : createLaunchSettings(options ?? null);
    return new GameSession(settings);
  }

  get meta(): SessionMeta {
    return {
      mode: this.launchSettings.mode,
      playerCount: this.launchSettings.playerCount,
      playerTypes: [...this.launchSettings.playerTypes],
      aiDifficulty: this.launchSettings.aiDifficulty,
      aiType: this.launchSettings.aiType
    };
  }

  createRuntimeConfig(): GameConfig {
    return GameSession.cloneConfig(this.launchSettings.gameConfig);
  }

  toLaunchSettings(): GameLaunchSettings {
    return {
      mode: this.launchSettings.mode,
      playerCount: this.launchSettings.playerCount,
      playerTypes: [...this.launchSettings.playerTypes],
      aiDifficulty: this.launchSettings.aiDifficulty,
      aiType: this.launchSettings.aiType,
      gameConfig: GameSession.cloneConfig(this.initialConfig)
    };
  }

  private static cloneConfig(config: GameConfig): GameConfig {
    const activePlayers = [...config.activePlayers];
    const playerConfigs = activePlayers.map((player) => {
      const existing = config.playerConfigs?.find((pc) => pc.player === player);
      if (existing?.isAI) {
        return {
          player,
          isAI: true,
          aiType: existing.aiType ?? 'greedy',
          aiDifficulty: existing.aiDifficulty ?? 'medium'
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
  }

  private static isLaunchSettings(
    value: GameLaunchSettings | GameSetupOptions
  ): value is GameLaunchSettings {
    const candidate = value as GameLaunchSettings | undefined;
    return (
      typeof candidate?.mode === 'string' &&
      typeof candidate?.playerCount === 'number' &&
      Array.isArray(candidate?.playerTypes) &&
      candidate?.gameConfig !== undefined
    );
  }
}
