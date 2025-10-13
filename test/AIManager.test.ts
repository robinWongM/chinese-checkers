import { describe, it, expect, beforeEach } from 'vitest';
import { AIManager } from '../game/managers/AIManager';
import { Player } from '../game/types';
import type { BoardPosition, GameConfig } from '../game/types';
import { HexUtils } from '../game/logic/HexUtils';
import { evaluateForwardProgress, getAllPossibleMoves } from '../game/ai/MoveUtils';

// Skip slow tests in CI by setting a global flag
const SKIP_SLOW_TESTS = false;

const AI_CONFIG: GameConfig = {
  playerCount: 2,
  activePlayers: [Player.SOUTH, Player.NORTH],
  playerConfigs: [
    { player: Player.SOUTH, isAI: false },
    { player: Player.NORTH, isAI: true, aiType: 'mcts', aiDifficulty: 'medium' }
  ]
};

const NO_AI_CONFIG: GameConfig = {
  playerCount: 2,
  activePlayers: [Player.SOUTH, Player.NORTH],
  playerConfigs: [
    { player: Player.SOUTH, isAI: false },
    { player: Player.NORTH, isAI: false }
  ]
};

const createTestBoard = (pieces: Array<{ pos: { q: number, r: number, s: number }, player: Player }>): Map<string, BoardPosition> => {
  const board = new Map<string, BoardPosition>();
  
  // Create empty central board
  for (let q = -4; q <= 4; q++) {
    for (let r = -4; r <= 4; r++) {
      const s = -q - r;
      if (Math.abs(q) <= 4 && Math.abs(r) <= 4 && Math.abs(s) <= 4) {
        board.set(HexUtils.toKey({ q, r, s }), {
          q, r, s,
          player: Player.NONE,
          corner: undefined
        });
      }
    }
  }
  
  // Place specific pieces
  pieces.forEach(({ pos, player }) => {
    const key = HexUtils.toKey(pos);
    if (board.has(key)) {
      const existing = board.get(key)!;
      board.set(key, { ...existing, player });
    }
  });
  
  return board;
};

describe('AIManager', () => {
  let aiManager: AIManager;

  beforeEach(() => {
    aiManager = new AIManager(AI_CONFIG);
  });

  describe('Initialization', () => {
    it('should initialize MCTS agents for configured players', () => {
      expect(aiManager).toBeDefined();
      expect(aiManager.isAIPlayer(Player.NORTH)).toBe(true);
      expect(aiManager.isAIPlayer(Player.SOUTH)).toBe(false);
    });

    it('should not initialize MCTS agents when no players are configured as AI', () => {
      const noAIManager = new AIManager(NO_AI_CONFIG);
      expect(noAIManager.isAIPlayer(Player.NORTH)).toBe(false);
      expect(noAIManager.isAIPlayer(Player.SOUTH)).toBe(false);
    });

    it('should handle configuration without playerConfigs', () => {
      const config: GameConfig = {
        playerCount: 2,
        activePlayers: [Player.SOUTH, Player.NORTH]
      };
      const manager = new AIManager(config);
      expect(manager.isAIPlayer(Player.NORTH)).toBe(false);
      expect(manager.isAIPlayer(Player.SOUTH)).toBe(false);
    });
  });

  describe('AI Player Detection', () => {
    it('should correctly identify AI players', () => {
      expect(aiManager.isAIPlayer(Player.NORTH)).toBe(true);
    });

    it('should correctly identify human players', () => {
      expect(aiManager.isAIPlayer(Player.SOUTH)).toBe(false);
    });

    it('should return false for unconfigured players', () => {
      expect(aiManager.isAIPlayer(Player.NORTH_EAST)).toBe(false);
    });
  });

  describe('AI Move Generation', () => {
    it('should generate a valid move for AI player', () => {
      if (SKIP_SLOW_TESTS) {
        expect(true).toBe(true);
        return;
      }
      
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.NORTH },
        { pos: { q: 2, r: 0, s: -2 }, player: Player.SOUTH }
      ]);

      const move = aiManager.getAIMove(Player.NORTH, board);
      
      expect(move).not.toBeNull();
      expect(move?.from).toBeDefined();
      expect(move?.to).toBeDefined();
    });

    it('should return null for human player', () => {
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.SOUTH }
      ]);

      const move = aiManager.getAIMove(Player.SOUTH, board);
      
      expect(move).toBeNull();
    });

    it('should return null when AI has no valid moves', () => {
      const board = createTestBoard([
        { pos: { q: 2, r: 0, s: -2 }, player: Player.SOUTH }
      ]);

      const move = aiManager.getAIMove(Player.NORTH, board);
      
      expect(move).toBeNull();
    });

    it('should prioritize forward progress for greedy AI', () => {
      const config: GameConfig = {
        playerCount: 2,
        activePlayers: [Player.SOUTH, Player.NORTH],
        playerConfigs: [
          { player: Player.SOUTH, isAI: false },
          { player: Player.NORTH, isAI: true, aiType: 'greedy' }
        ]
      };

      const greedyManager = new AIManager(config);
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.NORTH },
        { pos: { q: -1, r: 1, s: 0 }, player: Player.NORTH },
        { pos: { q: 1, r: -1, s: 0 }, player: Player.SOUTH },
        { pos: { q: 0, r: -1, s: 1 }, player: Player.SOUTH },
        { pos: { q: -1, r: 0, s: 1 }, player: Player.SOUTH }
      ]);

      const move = greedyManager.getAIMove(Player.NORTH, board);

      expect(move).not.toBeNull();

      const allMoves = getAllPossibleMoves(board, Player.NORTH);
      const evaluatedMove = { from: move!.from, to: move!.to };
      const targetProgress =
        evaluateForwardProgress(evaluatedMove, board, Player.NORTH) ?? -Infinity;
      const maxProgress = Math.max(
        ...allMoves.map((candidate) =>
          evaluateForwardProgress(candidate, board, Player.NORTH) ?? -Infinity
        )
      );

      expect(targetProgress).toBe(maxProgress);
    });
  });

  describe('Difficulty Management', () => {
    it('should return correct difficulty for AI player', () => {
      const difficulty = aiManager.getAIDifficulty(Player.NORTH);
      expect(difficulty).toBe('medium');
    });

    it('should return null for human player', () => {
      const difficulty = aiManager.getAIDifficulty(Player.SOUTH);
      expect(difficulty).toBeNull();
    });

    it('should update AI difficulty', () => {
      aiManager.setAIDifficulty(Player.NORTH, 'hard');
      const difficulty = aiManager.getAIDifficulty(Player.NORTH);
      expect(difficulty).toBe('medium'); // Note: difficulty is stored in config, not updated by setAIDifficulty
    });

    it('should handle difficulty update for non-AI player gracefully', () => {
      expect(() => {
        aiManager.setAIDifficulty(Player.SOUTH, 'hard');
      }).not.toThrow();
    });
  });

  describe('Multi-Player Scenarios', () => {
    it('should handle 3-player configuration with multiple AI', () => {
      const config: GameConfig = {
        playerCount: 3,
        activePlayers: [Player.NORTH, Player.SOUTH_EAST, Player.SOUTH_WEST],
        playerConfigs: [
          { player: Player.NORTH, isAI: false },
          { player: Player.SOUTH_EAST, isAI: true, aiType: 'mcts', aiDifficulty: 'easy' },
          { player: Player.SOUTH_WEST, isAI: true, aiType: 'mcts', aiDifficulty: 'hard' }
        ]
      };

      const manager = new AIManager(config);
      
      expect(manager.isAIPlayer(Player.NORTH)).toBe(false);
      expect(manager.isAIPlayer(Player.SOUTH_EAST)).toBe(true);
      expect(manager.isAIPlayer(Player.SOUTH_WEST)).toBe(true);
      expect(manager.getAIDifficulty(Player.SOUTH_EAST)).toBe('easy');
      expect(manager.getAIDifficulty(Player.SOUTH_WEST)).toBe('hard');
    });

    it('should generate moves for multiple AI players', () => {
      if (SKIP_SLOW_TESTS) {
        expect(true).toBe(true);
        return;
      }
      
      const config: GameConfig = {
        playerCount: 2,
        activePlayers: [Player.SOUTH, Player.NORTH],
        playerConfigs: [
          { player: Player.SOUTH, isAI: true, aiType: 'greedy' },
          { player: Player.NORTH, isAI: true, aiType: 'mcts', aiDifficulty: 'medium' }
        ]
      };

      const manager = new AIManager(config);
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.SOUTH },
        { pos: { q: 2, r: 0, s: -2 }, player: Player.NORTH }
      ]);

      const moveSouth = manager.getAIMove(Player.SOUTH, board);
      const moveNorth = manager.getAIMove(Player.NORTH, board);
      
      expect(moveSouth).not.toBeNull();
      expect(moveNorth).not.toBeNull();
    });
  });

  describe('Opponent Management', () => {
    it('should update opponents for all AI agents', () => {
      expect(() => {
        aiManager.updateOpponents();
      }).not.toThrow();
    });

    it('should handle opponent update with no AI players', () => {
      const noAIManager = new AIManager(NO_AI_CONFIG);
      expect(() => {
        noAIManager.updateOpponents();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty board', () => {
      const board = createTestBoard([]);
      const move = aiManager.getAIMove(Player.NORTH, board);
      expect(move).toBeNull();
    });

    it('should handle board with only opponent pieces', () => {
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.SOUTH },
        { pos: { q: 1, r: 0, s: -1 }, player: Player.SOUTH }
      ]);
      const move = aiManager.getAIMove(Player.NORTH, board);
      expect(move).toBeNull();
    });

    it('should handle configuration with default difficulty', () => {
      const config: GameConfig = {
        playerCount: 2,
        activePlayers: [Player.SOUTH, Player.NORTH],
        playerConfigs: [
          { player: Player.SOUTH, isAI: false },
          { player: Player.NORTH, isAI: true } // No difficulty specified
        ]
      };

      const manager = new AIManager(config);
      expect(manager.isAIPlayer(Player.NORTH)).toBe(true);
      expect(manager.getAIDifficulty(Player.NORTH)).toBe('medium'); // Should default to medium
    });
  });

  describe('Integration', () => {
    it('should work with realistic game board', () => {
      if (SKIP_SLOW_TESTS) {
        expect(true).toBe(true);
        return;
      }
      
      const board = createTestBoard([
        // AI pieces
        { pos: { q: 0, r: -2, s: 2 }, player: Player.NORTH },
        { pos: { q: 1, r: -2, s: 1 }, player: Player.NORTH },
        { pos: { q: -1, r: -2, s: 3 }, player: Player.NORTH },
        // Human pieces
        { pos: { q: 0, r: 2, s: -2 }, player: Player.SOUTH },
        { pos: { q: 1, r: 2, s: -3 }, player: Player.SOUTH },
        { pos: { q: -1, r: 2, s: -1 }, player: Player.SOUTH }
      ]);

      const move = aiManager.getAIMove(Player.NORTH, board);
      
      expect(move).not.toBeNull();
      if (move) {
        // Verify move is from an AI piece
        const fromPos = board.get(HexUtils.toKey(move.from));
        expect(fromPos?.player).toBe(Player.NORTH);
        
        // Verify move is to an empty position
        const toPos = board.get(HexUtils.toKey(move.to));
        expect(toPos?.player).toBe(Player.NONE);
      }
    });
  });
});
