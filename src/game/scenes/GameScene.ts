import Phaser from 'phaser';
import { Board } from '../objects/Board';
import { GameLogic } from '../objects/GameLogic';
import { Player, HexPosition } from '../types';

export class GameScene extends Phaser.Scene {
  private board!: Board;
  private gameLogic!: GameLogic;
  private playerTurnElement!: HTMLElement;
  private winMessageElement!: HTMLElement;
  private winnerTextElement!: HTMLElement;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    const hexSize = Math.min(width, height) / 20;
    const centerX = width / 2;
    const centerY = height / 2;

    this.board = new Board(this, centerX, centerY, hexSize);
    this.gameLogic = new GameLogic(this.board.getBoard());

    this.playerTurnElement = document.getElementById('player-turn')!;
    this.winMessageElement = document.getElementById('win-message')!;
    this.winnerTextElement = document.getElementById('winner-text')!;

    this.setupInputHandlers();
    this.setupUIButtons();
    this.updateUI();

    this.cameras.main.setBackgroundColor('#111827');
    
    // 旋转相机使棋盘更美观（逆时针旋转30度）
    this.cameras.main.setAngle(-30);
  }

  private setupInputHandlers(): void {
    this.board.getAllPieces().forEach((piece: Phaser.GameObjects.Arc) => {
      piece.on('pointerdown', () => {
        const pos = piece.getData('position');
        
        if (this.gameLogic.selectPiece(pos)) {
          this.board.clearHighlights();
          this.board.highlightSelected(pos);
          
          const validMoves = this.gameLogic.getState().validMoves;
          console.log(`Selected piece at (${pos.q},${pos.r}), ${validMoves.length} valid moves`);
          
          this.board.highlightPositions(validMoves, (targetPos) => {
            this.handleMove(targetPos);
          });
        }
      });
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const selectedPos = this.gameLogic.getState().selectedPosition;
      
      // 因为相机旋转了，需要将点击坐标转换回棋盘坐标系
      const { width, height } = this.cameras.main;
      const centerX = width / 2;
      const centerY = height / 2;
      
      // 将点击位置相对于中心点
      const relX = pointer.x - centerX;
      const relY = pointer.y - centerY;
      
      // 反向旋转（相机逆时针旋转了-30度，所以点击要顺时针旋转30度）
      const rotation = Math.PI / 6; // 反向旋转
      const rotatedX = relX * Math.cos(rotation) - relY * Math.sin(rotation) + centerX;
      const rotatedY = relX * Math.sin(rotation) + relY * Math.cos(rotation) + centerY;
      
      if (selectedPos) {
        const clickedPos = this.board.findPositionByPixel(rotatedX, rotatedY);
        
        if (clickedPos) {
          const clickedBoardPos = this.board.getPositionAt(clickedPos);
          
          // 检查是否点击了有效移动位置（绿色圆圈）
          const validMoves = this.gameLogic.getState().validMoves;
          const isValidMove = validMoves.some(move => 
            move.q === clickedPos.q && move.r === clickedPos.r
          );
          
          if (isValidMove && clickedBoardPos && clickedBoardPos.player === Player.NONE) {
            this.handleMove(clickedPos);
          } else if (clickedBoardPos && clickedBoardPos.player === this.gameLogic.getState().currentPlayer) {
            if (this.gameLogic.selectPiece(clickedPos)) {
              this.board.clearHighlights();
              this.board.highlightSelected(clickedPos);
              this.board.highlightPositions(this.gameLogic.getState().validMoves, (targetPos) => {
                this.handleMove(targetPos);
              });
            }
          } else {
            this.gameLogic.deselectPiece();
            this.board.clearHighlights();
          }
        } else {
          this.gameLogic.deselectPiece();
          this.board.clearHighlights();
        }
      }
    });
  }

  private handleMove(toPos: HexPosition): void {
    const actualFromPos = this.gameLogic.getState().selectedPosition;
    
    if (!actualFromPos) {
      return;
    }
    
    const from = { q: actualFromPos.q, r: actualFromPos.r, s: actualFromPos.s };
    const to = { q: toPos.q, r: toPos.r, s: toPos.s };
    
    // 先执行视觉移动，再更新游戏逻辑
    this.board.movePiece(from, to);
    
    const moveSuccess = this.gameLogic.movePiece(toPos);
    
    if (moveSuccess) {
      this.board.clearHighlights();
      
      this.time.delayedCall(350, () => {
        this.updatePieceInteractivity();
        this.updateUI();
        this.checkWin();
      });
    }
  }

  private updatePieceInteractivity(): void {
    const currentPlayer = this.gameLogic.getState().currentPlayer;
    
    this.board.getAllPieces().forEach((piece: Phaser.GameObjects.Arc) => {
      const pos = piece.getData('position');
      const boardPos = this.board.getPositionAt(pos);
      
      if (boardPos && boardPos.player === currentPlayer) {
        piece.removeAllListeners();
        piece.on('pointerdown', () => {
          if (this.gameLogic.selectPiece(pos)) {
            this.board.clearHighlights();
            this.board.highlightSelected(pos);
            this.board.highlightPositions(this.gameLogic.getState().validMoves, (targetPos) => {
              this.handleMove(targetPos);
            });
          }
        });
      }
    });
  }

  private setupUIButtons(): void {
    const restartBtn = document.getElementById('restart-btn')!;
    const newGameBtn = document.getElementById('new-game-btn')!;

    restartBtn.onclick = () => this.restartGame();
    newGameBtn.onclick = () => this.restartGame();
  }

  private updateUI(): void {
    const state = this.gameLogic.getState();
    const playerName = state.currentPlayer === Player.PLAYER1 ? 'Player 1' : 'Player 2';
    const playerColor = state.currentPlayer === Player.PLAYER1 ? 'text-blue-400' : 'text-red-400';
    
    this.playerTurnElement.innerHTML = `<span class="${playerColor}">${playerName}'s Turn</span>`;
  }

  private checkWin(): void {
    const state = this.gameLogic.getState();
    
    if (state.winner) {
      const winnerName = state.winner === Player.PLAYER1 ? 'Player 1' : 'Player 2';
      const winnerColor = state.winner === Player.PLAYER1 ? 'text-blue-400' : 'text-red-400';
      
      this.winnerTextElement.innerHTML = `<span class="${winnerColor}">${winnerName} Wins!</span>`;
      this.winMessageElement.classList.remove('hidden');
    }
  }

  private restartGame(): void {
    this.winMessageElement.classList.add('hidden');
    this.scene.restart();
  }
}
