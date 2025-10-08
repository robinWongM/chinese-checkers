import Phaser from 'phaser';
import { Board } from '../objects/Board';
import { GameLogic } from '../objects/GameLogic';
import { UIManager } from '../managers/UIManager';
import { InputManager } from '../managers/InputManager';
import { AIManager } from '../managers/AIManager';
import { Player, HexPosition, GameConfig } from '../types';
import { PLAYER_VS_AI_CONFIG } from '../config/gameConfig';

const CAMERA_ANGLE = -30;
const POST_MOVE_DELAY = 350; // ms
const AI_THINKING_DELAY = 500; // ms - delay before AI makes a move

export class GameScene extends Phaser.Scene {
  private board!: Board;
  private gameLogic!: GameLogic;
  private uiManager!: UIManager;
  private inputManager!: InputManager;
  private aiManager!: AIManager;
  private gameConfig!: GameConfig;
  private isAIThinking: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Use AI configuration for Player vs AI mode
    this.gameConfig = PLAYER_VS_AI_CONFIG;

    // Reduced hex size to accommodate 6-corner layout (board extends to ±8)
    const hexSize = Math.min(width, height) / 24;
    const centerX = width / 2;
    const centerY = height / 2;

    this.board = new Board(this, centerX, centerY, hexSize, this.gameConfig);
    this.gameLogic = new GameLogic(this.board.getBoard(), this.gameConfig);
    this.aiManager = new AIManager(this.gameConfig);
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
    
    // Check if AI should make the first move
    this.checkAITurn();
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
      
      // Debug: Display clicked position
      if (clickedPos) {
        console.log(`🎯 Clicked position: (q: ${clickedPos.q}, r: ${clickedPos.r}, s: ${clickedPos.s})`);
        const boardPos = this.board.getPositionAt(clickedPos);
        if (boardPos) {
          console.log(`   Player: ${boardPos.player}, Corner: ${boardPos.corner}`);
        }
      } else {
        console.log('🎯 Clicked outside board');
      }
      
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
    // Don't allow selection if AI is thinking
    if (this.isAIThinking) {
      return;
    }
    
    // Don't allow selection if current player is AI
    if (this.aiManager.isAIPlayer(this.gameLogic.getState().currentPlayer)) {
      return;
    }
    
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
        
        // Check if AI should move next
        this.checkAITurn();
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

  /**
   * Check if it's AI's turn and make AI move if so
   */
  private checkAITurn(): void {
    const currentPlayer = this.gameLogic.getState().currentPlayer;
    
    if (this.aiManager.isAIPlayer(currentPlayer) && !this.isAIThinking && !this.gameLogic.getState().winner) {
      this.makeAIMove();
    }
  }

  /**
   * Make AI move with a delay for better UX
   */
  private makeAIMove(): void {
    this.isAIThinking = true;
    const currentPlayer = this.gameLogic.getState().currentPlayer;
    
    console.log(`🤖 AI Player ${currentPlayer} is thinking...`);
    
    this.time.delayedCall(AI_THINKING_DELAY, () => {
      const move = this.aiManager.getAIMove(currentPlayer, this.gameLogic.getState().board);
      
      if (move) {
        console.log(`🤖 AI moves from (${move.from.q},${move.from.r}) to (${move.to.q},${move.to.r})`);
        
        // Select the piece
        this.gameLogic.selectPiece(move.from);
        
        // Perform the visual move
        this.board.movePiece(move.from, move.to);
        
        // Update game state
        const moveSuccess = this.gameLogic.movePiece(move.to);
        
        if (moveSuccess) {
          this.time.delayedCall(POST_MOVE_DELAY, () => {
            this.isAIThinking = false;
            this.updatePieceInteractivity();
            this.updateUI();
            this.checkWin();
            
            // Check if next player is also AI (for AI vs AI mode)
            this.checkAITurn();
          });
        } else {
          this.isAIThinking = false;
          console.error('❌ AI move failed');
        }
      } else {
        this.isAIThinking = false;
        console.error('❌ AI could not find a valid move');
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
