import type { HexPosition, BoardPosition } from '../types';

/**
 * Node in the MCTS search tree
 */
export class MCTSNode {
  public board: Map<string, BoardPosition>;
  public playerId: number;
  public parent: MCTSNode | null;
  public move: { from: HexPosition; to: HexPosition } | null;
  public children: MCTSNode[];
  public wins: number;
  public visits: number;
  public untriedMoves: Array<{ from: HexPosition; to: HexPosition }>;

  constructor(
    board: Map<string, BoardPosition>,
    playerId: number,
    parent: MCTSNode | null = null,
    move: { from: HexPosition; to: HexPosition } | null = null
  ) {
    // Deep clone the board
    this.board = new Map();
    board.forEach((pos, key) => {
      this.board.set(key, {
        q: pos.q,
        r: pos.r,
        s: pos.s,
        player: pos.player,
        corner: pos.corner
      });
    });

    this.playerId = playerId;
    this.parent = parent;
    this.move = move;
    this.children = [];
    this.wins = 0;
    this.visits = 0;
    this.untriedMoves = [];
  }

  /**
   * Check if node is fully expanded (all moves tried)
   */
  public isFullyExpanded(): boolean {
    return this.untriedMoves.length === 0;
  }

  /**
   * Check if node is terminal (no more moves available)
   */
  public isTerminal(): boolean {
    return this.untriedMoves.length === 0 && this.children.length === 0;
  }

  /**
   * Select best child using UCB1 formula
   */
  public bestChild(explorationParam: number = 1.4): MCTSNode | null {
    if (this.children.length === 0) {
      return null;
    }

    let bestScore = -Infinity;
    let bestChild: MCTSNode | null = null;

    for (const child of this.children) {
      if (child.visits === 0) {
        return child; // Prioritize unvisited children
      }

      // UCB1 formula: exploitation + exploration
      const exploitation = child.wins / child.visits;
      const exploration = Math.sqrt(Math.log(this.visits) / child.visits);
      const ucb1Score = exploitation + explorationParam * exploration;

      if (ucb1Score > bestScore) {
        bestScore = ucb1Score;
        bestChild = child;
      }
    }

    return bestChild;
  }

  /**
   * Get most visited child (best move after search)
   */
  public mostVisitedChild(): MCTSNode | null {
    if (this.children.length === 0) {
      return null;
    }

    let maxVisits = -1;
    let bestChild: MCTSNode | null = null;

    for (const child of this.children) {
      if (child.visits > maxVisits) {
        maxVisits = child.visits;
        bestChild = child;
      }
    }

    return bestChild;
  }
}

