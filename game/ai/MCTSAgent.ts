import type { HexPosition, BoardPosition, Player, GameConfig } from '../types';
import { PlayerInfo } from '../types';
import { HexUtils } from '../logic/HexUtils';
import { MCTSNode } from './MCTSNode';
import type { AIAgent } from './AIAgent';
import type { Move } from './MoveUtils';
import {
  applyMove,
  getAllPossibleMoves,
  getCornerCenter
} from './MoveUtils';

/**
 * Monte Carlo Tree Search AI Agent for Chinese Checkers
 * Based on: https://raw.githubusercontent.com/OscarSwift89/UndergradProj-shuyang/refs/heads/main/ai/mcts_ai.py
 */
export class MCTSAgent implements AIAgent {
  private player: Player;
  private opponent: Player;
  private config: GameConfig;
  private timeLimit: number; // Time limit in milliseconds
  private depthLimit: number; // Depth limit for simulation

  constructor(
    player: Player,
    opponent: Player,
    config: GameConfig,
    timeLimit: number = 1000 // 1 second default
  ) {
    this.player = player;
    this.opponent = opponent;
    this.config = config;
    this.timeLimit = timeLimit;
    this.depthLimit = 15; // Simulation depth limit
  }

  /**
   * Choose the best move using MCTS
   */
  public getBestMove(board: Map<string, BoardPosition>): Move | null {
    const root = new MCTSNode(board, this.player);
    root.untriedMoves = getAllPossibleMoves(board, this.player);

    if (root.untriedMoves.length === 0) {
      return null;
    }

    const startTime = Date.now();
    let iterationCount = 0;

    console.log(`🤖 MCTS starting search with ${root.untriedMoves.length} possible moves...`);

    // Run MCTS iterations until time limit
    while (Date.now() - startTime < this.timeLimit) {
      iterationCount++;

      // 1. Selection: Select a node to expand
      let node = this.select(root);

      // 2. Expansion: Expand if there are untried moves
      if (node.untriedMoves.length > 0) {
        node = this.expand(node);
      }

      // 3. Simulation: Simulate a random game from this node
      const result = this.simulate(node);

      // 4. Backpropagation: Update statistics
      this.backpropagate(node, result);
    }

    console.log(`🤖 MCTS completed ${iterationCount} iterations in ${Date.now() - startTime}ms`);

    // Choose the most visited child
    const bestChild = root.mostVisitedChild();
    
    if (bestChild && bestChild.move) {
      console.log(`🎯 Best move: (${bestChild.move.from.q},${bestChild.move.from.r}) → (${bestChild.move.to.q},${bestChild.move.to.r}) [visits: ${bestChild.visits}, wins: ${bestChild.wins}]`);
      return bestChild.move;
    }

    // Fallback to random untried move if no children
    if (root.untriedMoves.length > 0) {
      const randomMove =
        root.untriedMoves[Math.floor(Math.random() * root.untriedMoves.length)] ??
        null;
      if (randomMove) {
        console.log(`⚠️ Fallback to random move`);
        return randomMove;
      }
    }

    return null;
  }

  /**
   * Selection phase: Select a promising node using UCB1
   */
  private select(node: MCTSNode): MCTSNode {
    while (node.untriedMoves.length === 0 && node.children.length > 0) {
      const bestChild = node.bestChild();
      if (!bestChild) break;
      node = bestChild;
    }
    return node;
  }

  /**
   * Expansion phase: Add a new child node
   */
  private expand(node: MCTSNode): MCTSNode {
    if (node.untriedMoves.length === 0) {
      return node;
    }

    // Pop a random untried move
    const moveIndex = Math.floor(Math.random() * node.untriedMoves.length);
    const move = node.untriedMoves.splice(moveIndex, 1)[0];

    if (!move) {
      return node;
    }

    // Create new board state with the move applied
    const newBoard = applyMove(node.board, move);

    // Create child node
    const childNode = new MCTSNode(newBoard, this.player, node, move);
    childNode.untriedMoves = getAllPossibleMoves(newBoard, this.player);

    node.children.push(childNode);
    return childNode;
  }

  /**
   * Simulation phase: Play out a random game
   * Uses semi-greedy approach: greedy for AI player, random for opponent
   */
  private simulate(node: MCTSNode): number {
    let board = new Map<string, BoardPosition>();
    node.board.forEach((pos, key) => {
      board.set(key, { ...pos });
    });

    let currentPlayer = this.player;

    for (let depth = 0; depth < this.depthLimit; depth++) {
      const moves = getAllPossibleMoves(board, currentPlayer);
      
      if (moves.length === 0) {
        break;
      }

      let chosenMove: Move | null = null;

      if (currentPlayer === this.player) {
        // AI player: Use greedy selection (best evaluation)
        const [firstMove] = moves;
        if (!firstMove) {
          break;
        }

        let bestMove = firstMove;
        let bestValue = -Infinity;

        for (const move of moves) {
          const simBoard = applyMove(board, move);
          const value = this.evaluate(simBoard);
          
          if (value > bestValue) {
            bestValue = value;
            bestMove = move;
          }
        }

        chosenMove = bestMove;
      } else {
        // Opponent: Random selection
        chosenMove =
          moves[Math.floor(Math.random() * moves.length)] ?? null;
      }

      if (!chosenMove) {
        break;
      }

      board = applyMove(board, chosenMove);

      // Alternate players
      const activePlayers = this.config.activePlayers;
      if (activePlayers.length === 0) {
        break;
      }

      const playerIndex = activePlayers.indexOf(currentPlayer);
      const nextPlayerIndex =
        playerIndex >= 0
          ? (playerIndex + 1) % activePlayers.length
          : 0;
      const nextPlayer = activePlayers[nextPlayerIndex];
      if (nextPlayer === undefined) {
        break;
      }
      currentPlayer = nextPlayer;
    }

    return this.evaluate(board);
  }

  /**
   * Backpropagation phase: Update node statistics
   */
  private backpropagate(node: MCTSNode | null, result: number): void {
    while (node !== null) {
      node.visits++;
      
      // Positive result means good for AI
      if (result > 0) {
        node.wins++;
      }
      
      node = node.parent;
    }
  }

  /**
   * Evaluate board state
   * Returns negative distance sum (closer to goal = better)
   */
  private evaluate(board: Map<string, BoardPosition>): number {
    const goalCorner = PlayerInfo.getOppositeCorner(this.player);
    const goalCenter = getCornerCenter(goalCorner);

    let aiDistance = 0;
    let opponentDistance = 0;

    board.forEach((pos) => {
      if (pos.player === this.player) {
        // AI player: negative distance (closer = better)
        const distance = HexUtils.distance(pos, goalCenter);
        aiDistance += distance;
      } else if (pos.player === this.opponent) {
        // Opponent: positive distance (their progress hurts us)
        const opponentGoal = PlayerInfo.getOppositeCorner(this.opponent);
        const opponentGoalCenter = getCornerCenter(opponentGoal);
        const distance = HexUtils.distance(pos, opponentGoalCenter);
        opponentDistance += distance;
      }
    });

    // Return score: lower AI distance is better, higher opponent distance is better
    return -aiDistance + (opponentDistance * 0.5);
  }

  /**
   * Set time limit for search
   */
  public setTimeLimit(timeLimit: number): void {
    this.timeLimit = timeLimit;
  }

  /**
   * Set opponent player
   */
  public setOpponent(opponent: Player): void {
    this.opponent = opponent;
  }
}
