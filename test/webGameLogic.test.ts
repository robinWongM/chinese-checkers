import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  getValidMoves,
  hexDistance,
  keyOf,
  pieceMap,
  type GameState,
} from '../app/utils/chineseCheckers';

describe('web chinese checkers logic', () => {
  it('creates a full star board and 20 pieces', () => {
    const state = createInitialState();
    expect(state.cells).toHaveLength(121);
    expect(state.pieces).toHaveLength(20);
    expect(state.pieces.filter((piece) => piece.player === 1)).toHaveLength(10);
    expect(state.pieces.filter((piece) => piece.player === 2)).toHaveLength(10);
  });

  it('supports adjacent moves for a starting piece', () => {
    const state = createInitialState();
    const movable = state.pieces
      .filter((piece) => piece.player === 1)
      .find((piece) => getValidMoves(state, piece.id).length > 0);
    expect(movable).toBeDefined();
    const moves = getValidMoves(state, movable!.id);
    expect(moves.length).toBeGreaterThan(0);
  });

  it('supports classic one-gap jump when the middle piece is adjacent', () => {
    const initial = createInitialState();
    const custom: GameState = {
      ...initial,
      pieces: [
        { id: 'p1-test', player: 1, position: keyOf(0, 0, 0) },
        { id: 'p2-block', player: 2, position: keyOf(1, -1, 0) },
      ],
      currentPlayer: 1,
    };

    const moves = getValidMoves(custom, 'p1-test');
    const jumpTarget = keyOf(2, -2, 0);

    expect(moves).toContain(jumpTarget);
    expect(hexDistance(keyOf(0, 0, 0), jumpTarget)).toBe(2);
  });

  it('allows gap jump as long as landing mirrors distance around the middle piece', () => {
    const initial = createInitialState();
    const custom: GameState = {
      ...initial,
      pieces: [
        { id: 'p1-test', player: 1, position: keyOf(0, 0, 0) },
        { id: 'p2-middle', player: 2, position: keyOf(2, -2, 0) },
      ],
      currentPlayer: 1,
    };

    const moves = getValidMoves(custom, 'p1-test');
    const jumpTarget = keyOf(4, -4, 0);

    expect(moves).toContain(jumpTarget);
    expect(hexDistance(keyOf(0, 0, 0), keyOf(2, -2, 0))).toBe(2);
    expect(hexDistance(keyOf(2, -2, 0), jumpTarget)).toBe(2);
  });

  it('disallows jump if there are extra pieces between middle piece and destination', () => {
    const initial = createInitialState();
    const custom: GameState = {
      ...initial,
      pieces: [
        { id: 'p1-test', player: 1, position: keyOf(0, 0, 0) },
        { id: 'p2-middle', player: 2, position: keyOf(2, -2, 0) },
        { id: 'p2-extra', player: 2, position: keyOf(3, -3, 0) },
      ],
      currentPlayer: 1,
    };

    const moves = getValidMoves(custom, 'p1-test');
    expect(moves).not.toContain(keyOf(4, -4, 0));
  });

  it('does not overlap pieces in initial setup', () => {
    const state = createInitialState();
    const occupied = pieceMap(state);
    expect(occupied.size).toBe(state.pieces.length);
  });
});
