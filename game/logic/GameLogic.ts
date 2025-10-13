import type { HexPosition, BoardPosition, GameState, GameConfig } from '../types';
import { Player, PlayerInfo } from '../types';
import { HexUtils } from './HexUtils';

export class GameLogic {
  private gameState: GameState;

  constructor(board: Map<string, BoardPosition>, config: GameConfig) {
    const activePlayers = config.activePlayers;
    const startingPlayer =
      activePlayers.length > 0 ? activePlayers[0] ?? Player.NONE : Player.NONE;

    this.gameState = {
      config,
      currentPlayer: startingPlayer,
      currentPlayerIndex: 0,
      board,
      selectedPosition: null,
      validMoves: [],
      winner: null
    };
  }

  public selectPiece(pos: HexPosition): boolean {
    const boardPos = this.gameState.board.get(HexUtils.toKey(pos));
    
    if (!boardPos || boardPos.player !== this.gameState.currentPlayer) {
      return false;
    }

    this.gameState.selectedPosition = pos;
    this.gameState.validMoves = this.calculateValidMoves(pos);
    return true;
  }

  public movePiece(to: HexPosition): boolean {
    if (!this.gameState.selectedPosition) {
      return false;
    }

    const isValid = this.gameState.validMoves.some(move => 
      HexUtils.equals(move, to)
    );

    if (!isValid) {
      return false;
    }

    const fromKey = HexUtils.toKey(this.gameState.selectedPosition);
    const toKey = HexUtils.toKey(to);
    const fromPos = this.gameState.board.get(fromKey)!;
    const toPos = this.gameState.board.get(toKey)!;

    toPos.player = fromPos.player;
    fromPos.player = Player.NONE;

    if (this.checkWin()) {
      this.gameState.winner = this.gameState.currentPlayer;
    } else {
      // Move to next player
      const totalPlayers = this.gameState.config.activePlayers.length;
      if (totalPlayers > 0) {
        this.gameState.currentPlayerIndex =
          (this.gameState.currentPlayerIndex + 1) % totalPlayers;
        this.gameState.currentPlayer =
          this.gameState.config.activePlayers[this.gameState.currentPlayerIndex] ??
          Player.NONE;
      }
    }

    this.gameState.selectedPosition = null;
    this.gameState.validMoves = [];
    return true;
  }

  private calculateValidMoves(from: HexPosition): HexPosition[] {
    const moves: HexPosition[] = [];
    const visited = new Set<string>();
    
    this.debugLog(`\n🔍 Calculating valid moves from (${from.q}, ${from.r}, ${from.s})`);
    
    // Adjacent moves (1 step)
    const neighbors = HexUtils.getNeighbors(from);
    neighbors.forEach((neighbor: HexPosition) => {
      const pos = this.gameState.board.get(HexUtils.toKey(neighbor));
      if (pos && pos.player === Player.NONE) {
        moves.push(neighbor);
        this.debugLog(`  ✓ Adjacent move: (${neighbor.q}, ${neighbor.r}, ${neighbor.s})`);
      }
    });

    // Jump moves (can be chained)
    this.findJumpMoves(from, moves, visited, from);

    this.debugLog(`📊 Total moves found: ${moves.length}`);
    return moves;
  }

  private findJumpMoves(
    from: HexPosition, 
    moves: HexPosition[], 
    visited: Set<string>,
    originalStart: HexPosition
  ): void {
    visited.add(HexUtils.toKey(from));

    const neighbors = HexUtils.getNeighbors(from);
    
    const hasPieceAt = (pos: HexPosition): boolean => {
      if (HexUtils.equals(pos, originalStart)) {
        return false;
      }
      const boardPos = this.gameState.board.get(HexUtils.toKey(pos));
      return boardPos ? boardPos.player !== Player.NONE : false;
    };
    
    neighbors.forEach((neighbor: HexPosition) => {
      const neighborKey = HexUtils.toKey(neighbor);
      const neighborPos = this.gameState.board.get(neighborKey);
      
      if (!neighborPos) return;
      
      // Type 1: Standard jump over an adjacent piece
      if (hasPieceAt(neighbor)) {
        const jumpPos = {
          q: neighbor.q + (neighbor.q - from.q),
          r: neighbor.r + (neighbor.r - from.r),
          s: neighbor.s + (neighbor.s - from.s)
        };

        const jumpKey = HexUtils.toKey(jumpPos);
        const jumpBoardPos = this.gameState.board.get(jumpKey);

        if (jumpBoardPos && 
            jumpBoardPos.player === Player.NONE && 
            !visited.has(jumpKey)) {
          
          if (!moves.some(m => HexUtils.equals(m, jumpPos))) {
            this.debugLog(`  🦘 Type 1 Jump: (${from.q}, ${from.r}) → over (${neighbor.q}, ${neighbor.r}) → land (${jumpPos.q}, ${jumpPos.r})`);
            moves.push(jumpPos);
          }

          this.findJumpMoves(jumpPos, moves, visited, originalStart);
        }
      }
      
      // Type 2: Long jump over empty spaces to a piece, then jump over it.
      if (!hasPieceAt(neighbor)) {
        const direction = {
          q: neighbor.q - from.q,
          r: neighbor.r - from.r,
          s: neighbor.s - from.s
        };
        
        let distance = 1;
        let currentPos = neighbor;
        
        while (distance <= 10) { // Max search distance to prevent infinite loops
          const nextPos = {
            q: currentPos.q + direction.q,
            r: currentPos.r + direction.r,
            s: currentPos.s + direction.s
          };
          
          const nextKey = HexUtils.toKey(nextPos);
          const nextBoardPos = this.gameState.board.get(nextKey);
          
          if (!nextBoardPos) break;
          
          if (hasPieceAt(nextPos)) {
            // Found a piece, calculate the landing spot
            const jumpPos = {
              q: nextPos.q + (nextPos.q - from.q),
              r: nextPos.r + (nextPos.r - from.r),
              s: nextPos.s + (nextPos.s - from.s)
            };
            
            this.debugLog(`  🚀 Type 2 Jump attempt: from (${from.q}, ${from.r}) → empty×${distance} → over piece (${nextPos.q}, ${nextPos.r}) → land (${jumpPos.q}, ${jumpPos.r})`);
            
            const jumpKey = HexUtils.toKey(jumpPos);
            const jumpBoardPos = this.gameState.board.get(jumpKey);
            
            if (jumpBoardPos && 
                jumpBoardPos.player === Player.NONE && 
                !visited.has(jumpKey)) {
              
              // Verify that the path from the jumped piece to the landing spot is clear
              let pathClear = true;
              let checkPos = nextPos;
              
              for (let i = 0; i < distance; i++) {
                checkPos = {
                  q: checkPos.q + direction.q,
                  r: checkPos.r + direction.r,
                  s: checkPos.s + direction.s
                };
                
                const checkKey = HexUtils.toKey(checkPos);
                const checkBoardPos = this.gameState.board.get(checkKey);
                
                if (!checkBoardPos || (checkBoardPos.player !== Player.NONE && !HexUtils.equals(checkPos, originalStart))) {
                  pathClear = false;
                  break;
                }
              }
              
              if (pathClear) {
                if (!moves.some(m => HexUtils.equals(m, jumpPos))) {
                  this.debugLog(`    ✅ Type 2 Jump added: (${jumpPos.q}, ${jumpPos.r})`);
                  moves.push(jumpPos);
                }
                
                this.findJumpMoves(jumpPos, moves, visited, originalStart);
              } else {
                this.debugLog(`    ❌ Path not clear after jump`);
              }
            } else {
              if (!jumpBoardPos) this.debugLog(`    ❌ Jump position not on board`);
              else if (jumpBoardPos.player !== Player.NONE) this.debugLog(`    ❌ Jump position occupied`);
              else if (visited.has(jumpKey)) this.debugLog(`    ❌ Jump position already visited`);
            }
            break;
          }
          
          currentPos = nextPos;
          distance++;
        }
      }
    });
  }

  private checkWin(): boolean {
    const player = this.gameState.currentPlayer;
    const goalCorner = PlayerInfo.getOppositeCorner(player);
    
    let piecesInGoal = 0;
    let totalPieces = 0;

    this.gameState.board.forEach(pos => {
      if (pos.player === player) {
        totalPieces++;
        // Check if this piece is in the goal corner (opposite corner)
        if (pos.corner === goalCorner) {
          piecesInGoal++;
        }
      }
    });

    // All 10 pieces must be in the goal zone to win
    return totalPieces === 10 && piecesInGoal === 10;
  }

  public deselectPiece(): void {
    this.gameState.selectedPosition = null;
    this.gameState.validMoves = [];
  }

  public getState(): GameState {
    return this.gameState;
  }

  public reset(board: Map<string, BoardPosition>, config: GameConfig): void {
    const activePlayers = config.activePlayers;
    const startingPlayer =
      activePlayers.length > 0 ? activePlayers[0] ?? Player.NONE : Player.NONE;

    this.gameState = {
      config,
      currentPlayer: startingPlayer,
      currentPlayerIndex: 0,
      board,
      selectedPosition: null,
      validMoves: [],
      winner: null
    };
  }

  public exportState(): string {
    const boardArray: any[] = [];
    this.gameState.board.forEach((pos) => {
      boardArray.push({
        q: pos.q,
        r: pos.r,
        s: pos.s,
        player: pos.player
      });
    });

    const state = {
      currentPlayer: this.gameState.currentPlayer,
      board: boardArray
    };

    return JSON.stringify(state, null, 2);
  }

  public importState(jsonState: string): boolean {
    try {
      const state = JSON.parse(jsonState);

      // 1. Validate basic structure
      if (!state || typeof state !== 'object' || !state.hasOwnProperty('currentPlayer') || !state.hasOwnProperty('board')) {
        throw new Error("Invalid state object structure.");
      }

      // 2. Validate currentPlayer
      if (!Object.values(Player).includes(state.currentPlayer)) {
        throw new Error(`Invalid currentPlayer value: ${state.currentPlayer}`);
      }
      
      // 3. Validate board array
      if (!Array.isArray(state.board)) {
        throw new Error("State 'board' property must be an array.");
      }

      // Create a temporary representation of the new board to avoid partial updates
      const newBoardPlayers = new Map<string, Player>();
      
      // 4. Validate each piece in the board array
      for (const piece of state.board) {
        if (typeof piece.q !== 'number' || typeof piece.r !== 'number' || typeof piece.s !== 'number' || !Object.values(Player).includes(piece.player)) {
          throw new Error(`Invalid piece data in board array: ${JSON.stringify(piece)}`);
        }
        
        const key = HexUtils.toKey(piece);
        if (!this.gameState.board.has(key)) {
          throw new Error(`Piece position (${piece.q}, ${piece.r}) is out of bounds.`);
        }
        newBoardPlayers.set(key, piece.player);
      }

      // If all validations pass, apply the new state
      this.gameState.currentPlayer = state.currentPlayer;
      
      this.gameState.board.forEach((pos, key) => {
        pos.player = newBoardPlayers.get(key) || Player.NONE;
      });

      this.gameState.selectedPosition = null;
      this.gameState.validMoves = [];
      this.gameState.winner = null;

      return true;
    } catch (error) {
      console.error('❌ Failed to import board state:', error);
      return false;
    }
  }

  private debugLog(...args: unknown[]): void {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  }
}
