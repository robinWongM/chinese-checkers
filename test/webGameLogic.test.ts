import { describe, expect, it } from 'vitest';
import { createInitialState, getValidMoves, pieceMap } from '../app/utils/chineseCheckers';

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

  it('does not overlap pieces in initial setup', () => {
    const state = createInitialState();
    const occupied = pieceMap(state);
    expect(occupied.size).toBe(state.pieces.length);
  });
});
