import type { BoardPosition, HexPosition, Player } from '../types';
import { PlayerInfo } from '../types';
import { HexUtils } from '../logic/HexUtils';

export interface Move {
  from: HexPosition;
  to: HexPosition;
  score?: number;
}

/**
 * Precomputed goal centers for each player corner.
 */
const GOAL_CENTERS: Record<Player, HexPosition> = {
  [0]: { q: 0, r: 0, s: 0 },
  [1]: { q: -4, r: 8, s: 4 },   // NORTH
  [2]: { q: 8, r: -4, s: -4 },  // NORTH_EAST
  [3]: { q: 4, r: 4, s: -8 },   // SOUTH_EAST
  // [4]: { q: -4, r: 6, s: -2 },  // SOUTH
  [4]: { q: -4, r: 8, s: -4 },  
  [5]: { q: -8, r: 4, s: 4 },   // SOUTH_WEST
  [6]: { q: -4, r: -8, s: 12 }   // NORTH_WEST
};

/**
 * Clone board map to avoid mutating original state.
 */
export const cloneBoard = (board: Map<string, BoardPosition>): Map<string, BoardPosition> => {
  const newBoard = new Map<string, BoardPosition>();
  board.forEach((pos, key) => {
    newBoard.set(key, { ...pos });
  });
  return newBoard;
};

/**
 * Apply a move and return the resulting board state.
 */
export const applyMove = (
  board: Map<string, BoardPosition>,
  move: Move
): Map<string, BoardPosition> => {
  const newBoard = cloneBoard(board);

  const fromKey = HexUtils.toKey(move.from);
  const toKey = HexUtils.toKey(move.to);

  const fromPos = newBoard.get(fromKey);
  const toPos = newBoard.get(toKey);

  if (fromPos && toPos) {
    toPos.player = fromPos.player;
    fromPos.player = 0;
  }

  return newBoard;
};

/**
 * Return the central coordinate of a player's target corner.
 */
export const getCornerCenter = (corner: Player): HexPosition => {
  return GOAL_CENTERS[corner] || GOAL_CENTERS[0];
};

/**
 * Generate all valid moves for a player on the provided board.
 */
export const getAllPossibleMoves = (
  board: Map<string, BoardPosition>,
  player: Player
): Move[] => {
  const moves: Move[] = [];

  board.forEach((pos) => {
    if (pos.player === player) {
      const validMoves = calculateValidMoves(board, pos);
      validMoves.forEach((toPos) => {
        moves.push({
          from: { q: pos.q, r: pos.r, s: pos.s },
          to: toPos
        });
      });
    }
  });

  return moves;
};

/**
 * Evaluate progress towards goal for a single move.
 * Positive values indicate forward progress, negative values indicate moving away.
 */
export const evaluateForwardProgress = (
  move: Move,
  board: Map<string, BoardPosition>,
  player: Player
): number => {
  const goalCorner = PlayerInfo.getOppositeCorner(player);
  const goalCenter = getCornerCenter(goalCorner);

  const fromDistance = HexUtils.distance(move.from, goalCenter);

  const simulated = applyMove(board, move);
  const toKey = HexUtils.toKey(move.to);
  const toPos = simulated.get(toKey);

  if (!toPos) {
    return -Infinity;
  }

  const toDistance = HexUtils.distance(toPos, goalCenter);

  console.log(`Move[${move.from.q},${move.from.r},${move.from.s} -> ${move.to.q},${move.to.r},${move.to.s}] fromDistance: ${fromDistance}, toDistance: ${toDistance}`);

  return fromDistance - toDistance;
};

const calculateValidMoves = (
  board: Map<string, BoardPosition>,
  from: HexPosition
): HexPosition[] => {
  const moves: HexPosition[] = [];
  const visited = new Set<string>();

  // Adjacent moves
  const neighbors = HexUtils.getNeighbors(from);
  neighbors.forEach((neighbor) => {
    const pos = board.get(HexUtils.toKey(neighbor));
    if (pos && pos.player === 0) {
      moves.push(neighbor);
    }
  });

  // Jump moves
  findJumpMoves(board, from, moves, visited, from);

  return moves;
};

const findJumpMoves = (
  board: Map<string, BoardPosition>,
  from: HexPosition,
  moves: HexPosition[],
  visited: Set<string>,
  originalStart: HexPosition
): void => {
  visited.add(HexUtils.toKey(from));

  const neighbors = HexUtils.getNeighbors(from);

  const hasPieceAt = (pos: HexPosition): boolean => {
    if (HexUtils.equals(pos, originalStart)) {
      return false;
    }
    const boardPos = board.get(HexUtils.toKey(pos));
    return boardPos ? boardPos.player !== 0 : false;
  };

  neighbors.forEach((neighbor) => {
    const neighborPos = board.get(HexUtils.toKey(neighbor));
    if (!neighborPos) return;

    // Type 1: Standard jump
    if (hasPieceAt(neighbor)) {
      const jumpPos = {
        q: neighbor.q + (neighbor.q - from.q),
        r: neighbor.r + (neighbor.r - from.r),
        s: neighbor.s + (neighbor.s - from.s)
      };

      const jumpKey = HexUtils.toKey(jumpPos);
      const jumpBoardPos = board.get(jumpKey);

      if (jumpBoardPos && jumpBoardPos.player === 0 && !visited.has(jumpKey)) {
        if (!moves.some((m) => HexUtils.equals(m, jumpPos))) {
          moves.push(jumpPos);
        }
        findJumpMoves(board, jumpPos, moves, visited, originalStart);
      }
    }

    // Type 2: Long jump
    if (!hasPieceAt(neighbor)) {
      const direction = {
        q: neighbor.q - from.q,
        r: neighbor.r - from.r,
        s: neighbor.s - from.s
      };

      let distance = 1;
      let currentPos = neighbor;

      while (distance <= 10) {
        const nextPos = {
          q: currentPos.q + direction.q,
          r: currentPos.r + direction.r,
          s: currentPos.s + direction.s
        };

        const nextBoardPos = board.get(HexUtils.toKey(nextPos));
        if (!nextBoardPos) break;

        if (hasPieceAt(nextPos)) {
          const jumpPos = {
            q: nextPos.q + (nextPos.q - from.q),
            r: nextPos.r + (nextPos.r - from.r),
            s: nextPos.s + (nextPos.s - from.s)
          };

          const jumpKey = HexUtils.toKey(jumpPos);
          const jumpBoardPos = board.get(jumpKey);

          if (jumpBoardPos && jumpBoardPos.player === 0 && !visited.has(jumpKey)) {
            let pathClear = true;
            let checkPos = nextPos;

            for (let i = 0; i < distance; i++) {
              checkPos = {
                q: checkPos.q + direction.q,
                r: checkPos.r + direction.r,
                s: checkPos.s + direction.s
              };

              const checkBoardPos = board.get(HexUtils.toKey(checkPos));
              if (!checkBoardPos || (checkBoardPos.player !== 0 && !HexUtils.equals(checkPos, originalStart))) {
                pathClear = false;
                break;
              }
            }

            if (pathClear && !moves.some((m) => HexUtils.equals(m, jumpPos))) {
              moves.push(jumpPos);
              findJumpMoves(board, jumpPos, moves, visited, originalStart);
            }
          }
          break;
        }

        currentPos = nextPos;
        distance++;
      }
    }
  });
};
