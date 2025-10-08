import type { BoardPosition, Player } from '../types';
import { PlayerInfo } from '../types';
import { HexUtils } from '../objects/Position';
import type { AIAgent } from './AIAgent';
import type { Move } from './MoveUtils';
import {
  evaluateForwardProgress,
  getAllPossibleMoves,
  getCornerCenter
} from './MoveUtils';

/**
 * Greedy AI agent that always selects the move providing the largest forward progress.
 */
export class GreedyAgent implements AIAgent {
  constructor(private readonly player: Player) {}

  public getBestMove(board: Map<string, BoardPosition>): Move | null {
    const moves = getAllPossibleMoves(board, this.player);

    if (moves.length === 0) {
      return null;
    }

    const goalCorner = PlayerInfo.getOppositeCorner(this.player);
    const goalCenter = getCornerCenter(goalCorner);

    const scoredMoves = moves.map((move) => ({
      move,
      progress: evaluateForwardProgress(move, board, this.player),
      finalDistance: HexUtils.distance(move.to, goalCenter)
    }));

    if (scoredMoves.length === 0) {
      return null;
    }

    scoredMoves.sort((a, b) => {
      const scoreDiff = (b.progress ?? -Infinity) - (a.progress ?? -Infinity);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return a.finalDistance - b.finalDistance;
    });

    const bestScore = scoredMoves[0]?.progress ?? -Infinity;
    const bestMoves = scoredMoves.filter(
      (entry) => entry.progress === bestScore
    );
    const chosen =
      bestMoves[Math.floor(Math.random() * bestMoves.length)] ?? null;

    if (!chosen) {
      return null;
    }

    return {
      from: chosen.move.from,
      to: chosen.move.to,
      score: chosen.progress
    };
  }

  public setOpponent(_opponent: Player): void {
    // Greedy agent does not track opponent state.
  }

  public setTimeLimit(_timeLimit: number): void {
    // Greedy agent is instantaneous; time limit has no effect.
  }
}
