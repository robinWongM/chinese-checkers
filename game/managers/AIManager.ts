import { GreedyAgent } from '../ai/GreedyAgent';
import { MCTSAgent } from '../ai/MCTSAgent';
import type { AIAgent } from '../ai/AIAgent';
import type {
  Player,
  GameConfig,
  BoardPosition,
  HexPosition,
  AIType
} from '../types';

/**
 * Manager class to handle AI players in the game.
 */
export class AIManager {
  private agents: Map<Player, AIAgent>;
  private config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
    this.agents = new Map();
    this.initializeAgents();
  }

  /**
   * Initialize AI agents for players configured as AI.
   */
  private initializeAgents(): void {
    if (!this.config.playerConfigs) return;
    if (this.config.activePlayers.length === 0) {
      console.warn('⚠️ No active players configured for AIManager.');
      return;
    }

    this.config.playerConfigs.forEach((playerConfig, index) => {
      if (!playerConfig.isAI) {
        return;
      }

      const aiType: AIType = playerConfig.aiType ?? 'mcts';

      const activePlayers = this.config.activePlayers;
      if (activePlayers.length === 0) {
        return;
      }

      const opponentIndex = (index + 1) % activePlayers.length;
      const opponent = activePlayers[opponentIndex];

      if (opponent === undefined) {
        console.warn(`⚠️ Unable to resolve opponent for Player ${playerConfig.player}`);
        return;
      }

      const timeLimit = this.resolveTimeLimit(playerConfig.aiDifficulty);

      let agent: AIAgent;
      if (aiType === 'greedy') {
        agent = new GreedyAgent(playerConfig.player);
        console.log(`🤖 GREEDY AI initialized for Player ${playerConfig.player}`);
      } else {
        agent = new MCTSAgent(
          playerConfig.player,
          opponent,
          this.config,
          timeLimit
        );
        console.log(
          `🤖 MCTS AI initialized for Player ${playerConfig.player} with difficulty ${playerConfig.aiDifficulty} (time: ${timeLimit}ms)`
        );
      }

      agent.setOpponent?.(opponent);
      this.agents.set(playerConfig.player, agent);
    });
  }

  /**
   * Check if a player is controlled by AI.
   */
  public isAIPlayer(player: Player): boolean {
    return this.agents.has(player);
  }

  /**
   * Get the best move for an AI player.
   */
  public getAIMove(
    player: Player,
    board: Map<string, BoardPosition>
  ): { from: HexPosition; to: HexPosition } | null {
    const agent = this.agents.get(player);

    if (!agent) {
      console.warn(`⚠️ No AI agent found for player ${player}`);
      return null;
    }

    console.log(`🤖 AI Player ${player} is thinking...`);
    const move = agent.getBestMove(board);

    if (move) {
      return {
        from: move.from,
        to: move.to
      };
    }

    return null;
  }

  /**
   * Update opponent for all AI agents (useful when players change).
   */
  public updateOpponents(): void {
    this.config.playerConfigs?.forEach((playerConfig, index) => {
      if (!playerConfig.isAI) {
        return;
      }

      const agent = this.agents.get(playerConfig.player);
      if (!agent || !agent.setOpponent) {
        return;
      }

      const activePlayers = this.config.activePlayers;
      if (activePlayers.length === 0) {
        return;
      }
      const opponentIndex = (index + 1) % activePlayers.length;
      const opponent = activePlayers[opponentIndex];
      if (opponent === undefined) {
        return;
      }
      agent.setOpponent(opponent);
    });
  }

  /**
   * Get AI difficulty for a player.
   */
  public getAIDifficulty(player: Player): 'easy' | 'medium' | 'hard' | null {
    const playerConfig = this.config.playerConfigs?.find(
      (pc) => pc.player === player
    );
    return playerConfig?.isAI ? playerConfig.aiDifficulty || 'medium' : null;
  }

  /**
   * Update AI difficulty for a player.
   */
  public setAIDifficulty(
    player: Player,
    difficulty: 'easy' | 'medium' | 'hard'
  ): void {
    const agent = this.agents.get(player);
    if (!agent || !agent.setTimeLimit) {
      return;
    }

    const timeLimit = this.resolveTimeLimit(difficulty);
    agent.setTimeLimit(timeLimit);
    console.log(
      `🤖 AI difficulty for Player ${player} updated to ${difficulty} (time: ${timeLimit}ms)`
    );
  }

  private resolveTimeLimit(
    difficulty: 'easy' | 'medium' | 'hard' | undefined
  ): number {
    if (difficulty === 'easy') {
      return 500;
    }
    if (difficulty === 'hard') {
      return 2000;
    }
    return 1000;
  }
}
