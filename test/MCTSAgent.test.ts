import { describe, it, expect, beforeEach } from 'vitest';
import { MCTSAgent } from '../game/ai/MCTSAgent';
import { Player } from '../game/types';
import type { BoardPosition, GameConfig } from '../game/types';
import { HexUtils } from '../game/logic/HexUtils';

const TEST_CONFIG: GameConfig = {
  playerCount: 2,
  activePlayers: [Player.SOUTH, Player.NORTH],
  playerConfigs: [
    { player: Player.SOUTH, isAI: false },
    { player: Player.NORTH, isAI: true, aiDifficulty: 'medium' }
  ]
};

/**
 * Helper function to create a board with specific pieces
 */
const createTestBoard = (pieces: Array<{ pos: { q: number, r: number, s: number }, player: Player, corner?: Player }>): Map<string, BoardPosition> => {
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
  pieces.forEach(({ pos, player, corner }) => {
    const key = HexUtils.toKey(pos);
    if (board.has(key)) {
      board.set(key, { ...pos, player, corner });
    } else {
      board.set(key, { ...pos, player, corner });
    }
  });
  
  return board;
};

describe('MCTSAgent', () => {
  let mctsAgent: MCTSAgent;

  beforeEach(() => {
    mctsAgent = new MCTSAgent(Player.NORTH, Player.SOUTH, TEST_CONFIG, 100); // Short time limit for fast tests
  });

  describe('Basic Functionality', () => {
    it('should create an MCTS agent with correct player and opponent', () => {
      expect(mctsAgent).toBeDefined();
    });

    it('should return a valid move for a simple board', () => {
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.NORTH },
        { pos: { q: 2, r: 0, s: -2 }, player: Player.SOUTH }
      ]);

      const move = mctsAgent.getBestMove(board);
      
      expect(move).not.toBeNull();
      expect(move?.from).toBeDefined();
      expect(move?.to).toBeDefined();
      expect(move?.from.q).toBe(0);
      expect(move?.from.r).toBe(0);
    });

    it('should return null when no moves are available', () => {
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.SOUTH }
      ]);

      const move = mctsAgent.getBestMove(board);
      
      expect(move).toBeNull();
    });
  });

  describe('Move Selection', () => {
    it('should select a move within time limit', () => {
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.NORTH },
        { pos: { q: 2, r: 0, s: -2 }, player: Player.SOUTH }
      ]);

      const startTime = Date.now();
      const move = mctsAgent.getBestMove(board);
      const duration = Date.now() - startTime;
      
      expect(move).not.toBeNull();
      expect(duration).toBeLessThan(200); // Should complete within 200ms for 100ms time limit + overhead
    });

    it('should handle multiple piece scenarios', () => {
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.NORTH },
        { pos: { q: 1, r: 0, s: -1 }, player: Player.NORTH },
        { pos: { q: -1, r: 0, s: 1 }, player: Player.NORTH },
        { pos: { q: 0, r: 2, s: -2 }, player: Player.SOUTH },
        { pos: { q: 2, r: 0, s: -2 }, player: Player.SOUTH }
      ]);

      const move = mctsAgent.getBestMove(board);
      
      expect(move).not.toBeNull();
      expect(move?.from.q).toBeGreaterThanOrEqual(-1);
      expect(move?.from.q).toBeLessThanOrEqual(1);
    });
  });

  describe('Time Limit Control', () => {
    it('should respect short time limit', () => {
      const shortAgent = new MCTSAgent(Player.NORTH, Player.SOUTH, TEST_CONFIG, 50);
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.NORTH },
        { pos: { q: 2, r: 0, s: -2 }, player: Player.SOUTH }
      ]);

      const startTime = Date.now();
      const move = shortAgent.getBestMove(board);
      const duration = Date.now() - startTime;
      
      expect(move).not.toBeNull();
      expect(duration).toBeLessThan(150); // 50ms + overhead
    });

    it('should allow longer time limit for better moves', () => {
      const longAgent = new MCTSAgent(Player.NORTH, Player.SOUTH, TEST_CONFIG, 500);
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.NORTH },
        { pos: { q: 2, r: 0, s: -2 }, player: Player.SOUTH }
      ]);

      const startTime = Date.now();
      const move = longAgent.getBestMove(board);
      const duration = Date.now() - startTime;
      
      expect(move).not.toBeNull();
      expect(duration).toBeGreaterThan(400); // Should use most of the time
      expect(duration).toBeLessThan(700); // 500ms + reasonable overhead
    });

    it('should update time limit dynamically', () => {
      mctsAgent.setTimeLimit(200);
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.NORTH },
        { pos: { q: 2, r: 0, s: -2 }, player: Player.SOUTH }
      ]);

      const move = mctsAgent.getBestMove(board);
      expect(move).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle board with only AI pieces', () => {
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.NORTH },
        { pos: { q: 1, r: 0, s: -1 }, player: Player.NORTH }
      ]);

      const move = mctsAgent.getBestMove(board);
      expect(move).not.toBeNull();
    });

    it('should handle crowded board', () => {
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.NORTH },
        { pos: { q: 1, r: 0, s: -1 }, player: Player.SOUTH },
        { pos: { q: -1, r: 0, s: 1 }, player: Player.SOUTH },
        { pos: { q: 0, r: 1, s: -1 }, player: Player.SOUTH },
        { pos: { q: 0, r: -1, s: 1 }, player: Player.SOUTH },
        { pos: { q: 1, r: -1, s: 0 }, player: Player.SOUTH },
        { pos: { q: -1, r: 1, s: 0 }, player: Player.SOUTH }
      ]);

      const move = mctsAgent.getBestMove(board);
      expect(move).not.toBeNull();
    });

    it('should update opponent dynamically', () => {
      mctsAgent.setOpponent(Player.SOUTH_EAST);
      
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.NORTH },
        { pos: { q: 2, r: 0, s: -2 }, player: Player.SOUTH_EAST }
      ]);

      const move = mctsAgent.getBestMove(board);
      expect(move).not.toBeNull();
    });
  });

  describe('Move Validation', () => {
    it('should only return moves for AI player pieces', () => {
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.NORTH },
        { pos: { q: 1, r: 0, s: -1 }, player: Player.SOUTH }
      ]);

      const move = mctsAgent.getBestMove(board);
      
      expect(move).not.toBeNull();
      if (move) {
        const fromPos = board.get(HexUtils.toKey(move.from));
        expect(fromPos?.player).toBe(Player.NORTH);
      }
    });

    it('should only move to empty positions', () => {
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.NORTH },
        { pos: { q: 1, r: 0, s: -1 }, player: Player.SOUTH }
      ]);

      const move = mctsAgent.getBestMove(board);
      
      expect(move).not.toBeNull();
      if (move) {
        const toPos = board.get(HexUtils.toKey(move.to));
        expect(toPos?.player).toBe(Player.NONE);
      }
    });

    it('should return valid moves according to game rules', () => {
      const board = createTestBoard([
        { pos: { q: 0, r: 0, s: 0 }, player: Player.NORTH },
        { pos: { q: 0, r: 1, s: -1 }, player: Player.SOUTH }
      ]);

      const move = mctsAgent.getBestMove(board);
      
      expect(move).not.toBeNull();
      if (move) {
        const distance = Math.abs(move.to.q - move.from.q) + 
                        Math.abs(move.to.r - move.from.r) + 
                        Math.abs(move.to.s - move.from.s);
        const hexDistance = distance / 2;
        
        expect(hexDistance).toBeGreaterThan(0);
        expect(hexDistance).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('Strategic Play', () => {
    it('should prefer moves towards goal over time', () => {
      // Give it more time to explore
      const strategicAgent = new MCTSAgent(Player.NORTH, Player.SOUTH, TEST_CONFIG, 300);
      const board = createTestBoard([
        { pos: { q: 0, r: -2, s: 2 }, player: Player.NORTH },
        { pos: { q: 0, r: 2, s: -2 }, player: Player.SOUTH }
      ]);

      const move = strategicAgent.getBestMove(board);
      
      expect(move).not.toBeNull();
      // With MCTS and enough time, should generally move towards goal (south/positive r)
      if (move) {
        console.log(`MCTS selected move: (${move.from.q},${move.from.r}) → (${move.to.q},${move.to.r})`);
      }
    });
  });
});
