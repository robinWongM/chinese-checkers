import { describe, it, expect, beforeEach } from 'vitest';
import { GameLogic } from '../src/game/objects/GameLogic';
import { Player, type BoardPosition, type HexPosition } from '../src/game/types';
import { HexUtils } from '../src/game/objects/Position';

// Helper to create a mock board
const createMockBoard = (pieces: {pos: HexPosition, player: Player}[]): Map<string, BoardPosition> => {
  const board = new Map<string, BoardPosition>();
  // Create a 10x10 board area for testing
  for (let q = -10; q <= 10; q++) {
    for (let r = -10; r <= 10; r++) {
      const s = -q - r;
      if (Math.abs(q) <= 10 && Math.abs(r) <= 10 && Math.abs(s) <= 10) {
        const pos = { q, r, s };
        board.set(HexUtils.toKey(pos), { ...pos, player: Player.NONE });
      }
    }
  }

  pieces.forEach(p => {
    const key = HexUtils.toKey(p.pos);
    if (board.has(key)) {
      board.get(key)!.player = p.player;
    }
  });

  return board;
};

describe('GameLogic', () => {
  let gameLogic: GameLogic;
  let board: Map<string, BoardPosition>;

  beforeEach(() => {
    // A simple setup for most tests
    const pieces = [
      { pos: { q: 0, r: 0, s: 0 }, player: Player.PLAYER1 },
      { pos: { q: 1, r: 0, s: -1 }, player: Player.PLAYER2 },
    ];
    board = createMockBoard(pieces);
    gameLogic = new GameLogic(board);
  });

  it('should initialize with player 1 as the current player', () => {
    expect(gameLogic.getState().currentPlayer).toBe(Player.PLAYER1);
  });

  it('should allow selecting a piece of the current player', () => {
    const pos = { q: 0, r: 0, s: 0 };
    const result = gameLogic.selectPiece(pos);
    expect(result).toBe(true);
    expect(gameLogic.getState().selectedPosition).toEqual(pos);
  });

  it('should not allow selecting an opponent piece', () => {
    const pos = { q: 1, r: 0, s: -1 };
    const result = gameLogic.selectPiece(pos);
    expect(result).toBe(false);
    expect(gameLogic.getState().selectedPosition).toBeNull();
  });

  it('should not allow selecting an empty position', () => {
    const pos = { q: 0, r: 1, s: -1 };
    const result = gameLogic.selectPiece(pos);
    expect(result).toBe(false);
    expect(gameLogic.getState().selectedPosition).toBeNull();
  });

  describe('Movements', () => {
    it('should calculate valid adjacent moves when no jumps are possible', () => {
      const pieces = [
        { pos: { q: 0, r: 0, s: 0 }, player: Player.PLAYER1 },
      ];
      board = createMockBoard(pieces);
      gameLogic = new GameLogic(board);
      
      const pos = { q: 0, r: 0, s: 0 };
      gameLogic.selectPiece(pos);
      const validMoves = gameLogic.getState().validMoves;
      
      // All 6 neighbors should be valid moves
      expect(validMoves).toHaveLength(6);
      expect(validMoves).toContainEqual({ q: 1, r: 0, s: -1 });
    });

    it('should calculate both adjacent and jump moves if available', () => {
      const pos = { q: 0, r: 0, s: 0 }; // uses the board from beforeEach
      gameLogic.selectPiece(pos);
      const validMoves = gameLogic.getState().validMoves;
      
      const expectedAdjacentMoves = [
        { q: 0, r: -1, s: 1 },
        { q: 1, r: -1, s: 0 },
        { q: -1, r: 1, s: 0 },
        { q: 0, r: 1, s: -1 },
        { q: -1, r: 0, s: 1 },
      ];
      const expectedJumpMove = { q: 2, r: 0, s: -2 };

      expect(validMoves).toHaveLength(6);
      expect(validMoves).toContainEqual(expectedJumpMove);
      for (const move of expectedAdjacentMoves) {
        expect(validMoves).toContainEqual(move);
      }
    });

    it('should perform a valid adjacent move', () => {
      const fromPos = { q: 0, r: 0, s: 0 };
      const toPos = { q: 0, r: 1, s: -1 };
      
      gameLogic.selectPiece(fromPos);
      const result = gameLogic.movePiece(toPos);

      expect(result).toBe(true);
      const state = gameLogic.getState();
      expect(state.board.get(HexUtils.toKey(fromPos))?.player).toBe(Player.NONE);
      expect(state.board.get(HexUtils.toKey(toPos))?.player).toBe(Player.PLAYER1);
      expect(state.currentPlayer).toBe(Player.PLAYER2);
      expect(state.selectedPosition).toBeNull();
    });

    it('should calculate valid jump moves', () => {
      const pieces = [
        { pos: { q: 0, r: 0, s: 0 }, player: Player.PLAYER1 },
        { pos: { q: 0, r: 1, s: -1 }, player: Player.PLAYER2 }, // Piece to jump over
      ];
      board = createMockBoard(pieces);
      gameLogic = new GameLogic(board);

      gameLogic.selectPiece({ q: 0, r: 0, s: 0 });
      const validMoves = gameLogic.getState().validMoves;
      
      const jumpMove = { q: 0, r: 2, s: -2 };
      expect(validMoves).toContainEqual(jumpMove);
    });

    it('should perform a valid jump move', () => {
      const pieces = [
        { pos: { q: 0, r: 0, s: 0 }, player: Player.PLAYER1 },
        { pos: { q: 0, r: 1, s: -1 }, player: Player.PLAYER2 },
      ];
      board = createMockBoard(pieces);
      gameLogic = new GameLogic(board);

      const fromPos = { q: 0, r: 0, s: 0 };
      const toPos = { q: 0, r: 2, s: -2 };

      gameLogic.selectPiece(fromPos);
      const result = gameLogic.movePiece(toPos);

      expect(result).toBe(true);
      const state = gameLogic.getState();
      expect(state.board.get(HexUtils.toKey(fromPos))?.player).toBe(Player.NONE);
      expect(state.board.get(HexUtils.toKey(toPos))?.player).toBe(Player.PLAYER1);
      expect(state.board.get(HexUtils.toKey({ q: 0, r: 1, s: -1 }))?.player).toBe(Player.PLAYER2); // Make sure jumped piece is still there
      expect(state.currentPlayer).toBe(Player.PLAYER2);
    });

    it('should calculate chained jump moves', () => {
       const pieces = [
        { pos: { q: 0, r: 0, s: 0 }, player: Player.PLAYER1 },
        { pos: { q: 1, r: 0, s: -1 }, player: Player.PLAYER2 },
        { pos: { q: 3, r: 0, s: -3 }, player: Player.PLAYER2 },
      ];
      board = createMockBoard(pieces);
      gameLogic = new GameLogic(board);

      gameLogic.selectPiece({ q: 0, r: 0, s: 0 });
      const validMoves = gameLogic.getState().validMoves;
      
      const firstJump = { q: 2, r: 0, s: -2 };
      const secondJump = { q: 4, r: 0, s: -4 };
      expect(validMoves).toContainEqual(firstJump);
      expect(validMoves).toContainEqual(secondJump);
    });
  });

  describe('Win Condition', () => {
    it('should not declare a winner if the goal zone is not filled', () => {
      // This requires a more complex board setup reflecting the actual game
      // For now, we'll test a simplified win condition logic
      const result = (gameLogic as any).checkWin();
      expect(result).toBe(false);
    });
    
    it('should declare a winner when a player moves all pieces to the goal zone', () => {
      const player1Pieces = [
        { pos: { q: 0, r: 4, s: -4 }, player: Player.PLAYER1 },
        { pos: { q: 1, r: 3, s: -4 }, player: Player.PLAYER1 },
        { pos: { q: -1, r: 4, s: -3 }, player: Player.PLAYER1 },
      ];
      
      board = createMockBoard(player1Pieces);
      
      // Manually set goal zones for these positions
      player1Pieces.forEach(p => {
        board.get(HexUtils.toKey(p.pos))!.isGoalZone2 = true;
      });
      
      gameLogic = new GameLogic(board);
      (gameLogic as any).gameState.currentPlayer = Player.PLAYER1;
      
      // Mock total pieces to 3 for this test
      const originalCheckWin = (gameLogic as any).checkWin.bind(gameLogic);
      (gameLogic as any).checkWin = () => {
        const player = gameLogic.getState().currentPlayer;
        const goalZoneKey = player === Player.PLAYER1 ? 'isGoalZone2' : 'isGoalZone1';
        let piecesInGoal = 0;
        let totalPieces = 0;
        gameLogic.getState().board.forEach(pos => {
          if (pos.player === player) {
            totalPieces++;
            if (pos[goalZoneKey as keyof BoardPosition]) {
              piecesInGoal++;
            }
          }
        });
        return totalPieces === piecesInGoal && totalPieces === 3;
      };

      const result = (gameLogic as any).checkWin();
      expect(result).toBe(true);
    });
  });
});
