import Phaser from 'phaser';
import { Board } from '../objects/Board';
import { GameLogic } from '../objects/GameLogic';
import { UIManager } from '../managers/UIManager';
import { InputManager } from '../managers/InputManager';
import { Player, HexPosition } from '../types';

const CAMERA_ANGLE = -30;
const POST_MOVE_DELAY = 350; // ms

export class GameScene extends Phaser.Scene {
  private board!: Board;
  private gameLogic!: GameLogic;
  private uiManager!: UIManager;
  private inputManager!: InputManager;

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
    this.uiManager = new UIManager(
      () => this.restartGame(),
      () => this.exportGameState(),
      () => this.importGameState()
    );
    
    this.inputManager = new InputManager(this, CAMERA_ANGLE);
    this.setupInputHandlers();
    this.updateUI();

    this.cameras.main.setBackgroundColor('#111827');
    
    // Rotate the camera for a better isometric-like view
    this.cameras.main.setAngle(CAMERA_ANGLE);
  }

  private setupInputHandlers(): void {
    this.board.getAllPieces().forEach((piece: Phaser.GameObjects.Arc) => {
      piece.on('pointerdown', () => {
        const pos = piece.getData('position');
        this.handlePieceSelection(pos);
      });
    });

    this.inputManager.on('pointerdown_transformed', (coords: { x: number, y: number }) => {
      const selectedPos = this.gameLogic.getState().selectedPosition;
      
      const clickedPos = this.board.findPositionByPixel(coords.x, coords.y);
      
      if (!selectedPos) {
        if (clickedPos) {
           this.handlePieceSelection(clickedPos)
        }
        return;
      }
      
      if (clickedPos) {
        const clickedBoardPos = this.board.getPositionAt(clickedPos);
        
        // Check if the click was on a valid move highlight
        const isValidMove = this.gameLogic.getState().validMoves.some(move => 
          move.q === clickedPos.q && move.r === clickedPos.r
        );
        
        if (isValidMove && clickedBoardPos?.player === Player.NONE) {
          this.handleMove(clickedPos);
        } else if (clickedBoardPos?.player === this.gameLogic.getState().currentPlayer) {
          // If the player clicks another of their own pieces, select it instead
          this.handlePieceSelection(clickedPos);
        } else {
          // Clicked on an invalid spot or opponent piece, deselect
          this.gameLogic.deselectPiece();
          this.board.clearHighlights();
        }
      } else {
        // Clicked outside the board, deselect
        this.gameLogic.deselectPiece();
        this.board.clearHighlights();
      }
    });
  }
  
  private handlePieceSelection(pos: HexPosition): void {
    if (this.gameLogic.selectPiece(pos)) {
      this.board.clearHighlights();
      this.board.highlightSelected(pos);
      
      const validMoves = this.gameLogic.getState().validMoves;
      console.log(`Selected piece at (${pos.q},${pos.r}), ${validMoves.length} valid moves`);
      
      this.board.highlightPositions(validMoves, (targetPos) => {
        this.handleMove(targetPos);
      });
    }
  }

  private handleMove(toPos: HexPosition): void {
    const actualFromPos = this.gameLogic.getState().selectedPosition;
    
    if (!actualFromPos) {
      return;
    }
    
    const from = { q: actualFromPos.q, r: actualFromPos.r, s: actualFromPos.s };
    const to = { q: toPos.q, r: toPos.r, s: toPos.s };
    
    // Perform the visual move first, then update the game logic
    this.board.movePiece(from, to);
    
    const moveSuccess = this.gameLogic.movePiece(toPos);
    
    if (moveSuccess) {
      this.board.clearHighlights();
      
      this.time.delayedCall(POST_MOVE_DELAY, () => {
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
      
      piece.removeAllListeners('pointerdown');
      
      if (boardPos && boardPos.player === currentPlayer) {
        piece.on('pointerdown', () => this.handlePieceSelection(pos));
      }
    });
  }

  private exportGameState(): void {
    const state = this.gameLogic.exportState();
    navigator.clipboard.writeText(state).then(() => {
      console.log('📋 Board state copied to clipboard!');
      alert('✅ Board state copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('❌ Copy failed. See console for state.');
      console.log(state);
    });
  }

  private async importGameState(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      this.applyImportedState(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      const text = prompt('Please paste the board state JSON:');
      if (text) {
        this.applyImportedState(text);
      }
    }
  }
  
  private applyImportedState(state: string): void {
    if (this.gameLogic.importState(state)) {
      this.board.clearHighlights();
      this.board.renderBoard(this.gameLogic.getState().board);
      this.updateUI();
      this.updatePieceInteractivity();
      alert('✅ Board state imported successfully!');
    } else {
      alert('❌ Import failed. Invalid JSON format.');
    }
  }

  private updateUI(): void {
    this.uiManager.updateTurn(this.gameLogic.getState().currentPlayer);
  }

  private checkWin(): void {
    const state = this.gameLogic.getState();
    
    if (state.winner) {
      this.uiManager.showWinMessage(state.winner);
    }
  }

  private restartGame(): void {
    this.inputManager.destroy();
    this.uiManager.hideWinMessage();
    this.scene.restart();
  }
}
