import type { HexPosition, BoardPosition, GameState } from '../types';
import { Player } from '../types';
import { HexUtils } from './Position';

export class GameLogic {
  private gameState: GameState;

  constructor(board: Map<string, BoardPosition>) {
    this.gameState = {
      currentPlayer: Player.PLAYER1,
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
      this.gameState.currentPlayer = 
        this.gameState.currentPlayer === Player.PLAYER1 ? Player.PLAYER2 : Player.PLAYER1;
    }

    this.gameState.selectedPosition = null;
    this.gameState.validMoves = [];
    return true;
  }

  private calculateValidMoves(from: HexPosition): HexPosition[] {
    const moves: HexPosition[] = [];
    const visited = new Set<string>();
    
    // 相邻移动（一步）
    const neighbors = HexUtils.getNeighbors(from);
    neighbors.forEach(neighbor => {
      const pos = this.gameState.board.get(HexUtils.toKey(neighbor));
      if (pos && pos.player === Player.NONE) {
        moves.push(neighbor);
      }
    });

    // 跳跃移动（可以连续跳）
    const beforeJumps = moves.length;
    this.findJumpMoves(from, moves, visited);
    const jumpMoves = moves.length - beforeJumps;
    
    if (jumpMoves > 0) {
      console.log(`  Found ${jumpMoves} jump moves (can jump over other pieces)`);
    }

    return moves;
  }

  private findJumpMoves(
    from: HexPosition, 
    moves: HexPosition[], 
    visited: Set<string>
  ): void {
    visited.add(HexUtils.toKey(from));

    const neighbors = HexUtils.getNeighbors(from);
    
    console.log(`  Checking jumps from (${from.q},${from.r})...`);
    
    neighbors.forEach(neighbor => {
      const neighborKey = HexUtils.toKey(neighbor);
      const neighborPos = this.gameState.board.get(neighborKey);
      
      // 检查相邻位置是否有棋子（可以跳过）
      if (neighborPos && neighborPos.player !== Player.NONE) {
        console.log(`    Found piece at (${neighbor.q},${neighbor.r}) - checking jump...`);
        
        const jumpPos = {
          q: neighbor.q + (neighbor.q - from.q),
          r: neighbor.r + (neighbor.r - from.r),
          s: neighbor.s + (neighbor.s - from.s)
        };

        const jumpKey = HexUtils.toKey(jumpPos);
        const jumpBoardPos = this.gameState.board.get(jumpKey);

        console.log(`      Jump destination: (${jumpPos.q},${jumpPos.r})`);
        console.log(`      Position exists on board? ${!!jumpBoardPos}`);
        console.log(`      Is empty? ${jumpBoardPos?.player === Player.NONE}`);
        console.log(`      Already visited? ${visited.has(jumpKey)}`);

        if (jumpBoardPos && 
            jumpBoardPos.player === Player.NONE && 
            !visited.has(jumpKey)) {
          
          console.log(`      ✅ Valid jump to (${jumpPos.q},${jumpPos.r})!`);
          
          if (!moves.some(m => HexUtils.equals(m, jumpPos))) {
            moves.push(jumpPos);
          }

          // 递归查找连续跳跃
          this.findJumpMoves(jumpPos, moves, visited);
        } else {
          console.log(`      ❌ Cannot jump to (${jumpPos.q},${jumpPos.r})`);
        }
      }
    });
  }

  private checkWin(): boolean {
    const player = this.gameState.currentPlayer;
    const goalZoneKey = player === Player.PLAYER1 ? 'isGoalZone1' : 'isGoalZone2';
    
    let piecesInGoal = 0;
    let totalPieces = 0;

    this.gameState.board.forEach(pos => {
      if (pos.player === player) {
        totalPieces++;
        if (pos[goalZoneKey as keyof BoardPosition]) {
          piecesInGoal++;
        }
      }
    });

    return totalPieces === piecesInGoal && totalPieces === 10;
  }

  public deselectPiece(): void {
    this.gameState.selectedPosition = null;
    this.gameState.validMoves = [];
  }

  public getState(): GameState {
    return this.gameState;
  }

  public reset(board: Map<string, BoardPosition>): void {
    this.gameState = {
      currentPlayer: Player.PLAYER1,
      board,
      selectedPosition: null,
      validMoves: [],
      winner: null
    };
  }
}
