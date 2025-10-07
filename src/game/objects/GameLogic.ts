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
    this.findJumpMoves(from, moves, visited, from);  // 传入起始位置
    const jumpMoves = moves.length - beforeJumps;
    
    if (jumpMoves > 0) {
      console.log(`  Found ${jumpMoves} jump moves (can jump over other pieces)`);
    }

    return moves;
  }

  private findJumpMoves(
    from: HexPosition, 
    moves: HexPosition[], 
    visited: Set<string>,
    originalStart: HexPosition  // 新增：原始起点位置
  ): void {
    visited.add(HexUtils.toKey(from));

    const neighbors = HexUtils.getNeighbors(from);
    
    // 辅助函数：检查位置是否有棋子（把起始位置当作空位）
    const hasPieceAt = (pos: HexPosition): boolean => {
      // 如果是起始位置，当作空位
      if (HexUtils.equals(pos, originalStart)) {
        return false;
      }
      const boardPos = this.gameState.board.get(HexUtils.toKey(pos));
      return boardPos ? boardPos.player !== Player.NONE : false;
    };
    
    console.log(`  Checking jumps from (${from.q},${from.r})...`);
    
    neighbors.forEach(neighbor => {
      const neighborKey = HexUtils.toKey(neighbor);
      const neighborPos = this.gameState.board.get(neighborKey);
      
      if (!neighborPos) return; // 不在棋盘上
      
      // 类型1: 直接跳过相邻的棋子
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
          
          console.log(`    ✅ Jump over piece at (${neighbor.q},${neighbor.r}) to (${jumpPos.q},${jumpPos.r})`);
          
          if (!moves.some(m => HexUtils.equals(m, jumpPos))) {
            moves.push(jumpPos);
          }

          this.findJumpMoves(jumpPos, moves, visited, originalStart);
        }
      }
      
      // 类型2: 等距跳（空跳）- 跳过空格到有棋子的位置，再等距跳到另一边
      if (!hasPieceAt(neighbor)) {
        // 沿着这个方向继续搜索，找到第一个有棋子的位置
        const direction = {
          q: neighbor.q - from.q,
          r: neighbor.r - from.r,
          s: neighbor.s - from.s
        };
        
        let distance = 1;
        let currentPos = neighbor;
        
        while (distance <= 10) { // 最多搜索10步防止无限循环
          const nextPos = {
            q: currentPos.q + direction.q,
            r: currentPos.r + direction.r,
            s: currentPos.s + direction.s
          };
          
          const nextKey = HexUtils.toKey(nextPos);
          const nextBoardPos = this.gameState.board.get(nextKey);
          
          if (!nextBoardPos) break; // 超出棋盘
          
          if (hasPieceAt(nextPos)) {
            // 找到了棋子！计算等距跳的目标位置
            // 目标 = 棋子 + (棋子 - 起点)
            const jumpPos = {
              q: nextPos.q + (nextPos.q - from.q),
              r: nextPos.r + (nextPos.r - from.r),
              s: nextPos.s + (nextPos.s - from.s)
            };
            
            const jumpKey = HexUtils.toKey(jumpPos);
            const jumpBoardPos = this.gameState.board.get(jumpKey);
            
            if (jumpBoardPos && 
                jumpBoardPos.player === Player.NONE && 
                !visited.has(jumpKey)) {
              
              // 🔍 关键检查：验证从棋子到目标的路径是否都是空的
              let pathClear = true;
              let checkPos = nextPos;
              
              // 需要检查从棋子的下一格到目标的前一格，一共 distance 个位置
              for (let i = 0; i < distance; i++) {
                checkPos = {
                  q: checkPos.q + direction.q,
                  r: checkPos.r + direction.r,
                  s: checkPos.s + direction.s
                };
                
                const checkKey = HexUtils.toKey(checkPos);
                const checkBoardPos = this.gameState.board.get(checkKey);
                
                // 所有中间位置都必须为空（不包括目标）
                // 注意：起始位置被视为空，因为我们要移动这个棋子
                if (!checkBoardPos || (checkBoardPos.player !== Player.NONE && !HexUtils.equals(checkPos, originalStart))) {
                  pathClear = false;
                  console.log(`    ❌ Path blocked at (${checkPos.q},${checkPos.r})`);
                  break;
                }
              }
              
              if (pathClear) {
                console.log(`    ✅ Equal-distance jump: (${from.q},${from.r}) -> piece at (${nextPos.q},${nextPos.r}) -> (${jumpPos.q},${jumpPos.r}) [distance=${distance+1}]`);
                
                if (!moves.some(m => HexUtils.equals(m, jumpPos))) {
                  moves.push(jumpPos);
                }
                
                this.findJumpMoves(jumpPos, moves, visited, originalStart);
              }
            }
            break; // 找到棋子后停止
          }
          
          // 继续沿着这个方向搜索
          currentPos = nextPos;
          distance++;
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

  public exportState(): string {
    // 将棋盘状态转换为简单对象
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
      
      // 更新当前玩家
      this.gameState.currentPlayer = state.currentPlayer;
      
      // 重建棋盘 - 保留原始棋盘结构，只更新棋子位置
      this.gameState.board.forEach(pos => {
        pos.player = Player.NONE;
      });
      
      // 设置新的棋子位置
      state.board.forEach((piece: any) => {
        const key = HexUtils.toKey({ q: piece.q, r: piece.r, s: piece.s });
        const boardPos = this.gameState.board.get(key);
        if (boardPos) {
          boardPos.player = piece.player;
        }
      });

      // 清除选择状态
      this.gameState.selectedPosition = null;
      this.gameState.validMoves = [];
      this.gameState.winner = null;

      console.log('✅ Board state imported successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to import board state:', error);
      return false;
    }
  }
}
