import type { BoardPosition, Player } from '../types';
import type { Move } from './MoveUtils';

export interface AIAgent {
  getBestMove(board: Map<string, BoardPosition>): Move | null;
  setOpponent?(opponent: Player): void;
  setTimeLimit?(timeLimit: number): void;
}
