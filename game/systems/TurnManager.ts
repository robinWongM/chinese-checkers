import { FrameScheduler } from './FrameScheduler';
import type { AIManager } from '../managers/AIManager';
import type { GameBoardSystem } from './GameBoardSystem';
import type { GameHUD } from '../ui/GameHUD';
import type { GameLogic } from '../logic/GameLogic';
import { PlayerInfo, type Player } from '../types';

const POST_MOVE_DELAY = 350;
const AI_THINKING_DELAY = 500;

interface TurnManagerOptions {
  scheduler: FrameScheduler;
  board: GameBoardSystem;
  logic: GameLogic;
  aiManager: AIManager;
  hud: GameHUD;
  onStatus?: (message: string) => void;
}

export class TurnManager {
  private readonly scheduler: FrameScheduler;
  private readonly board: GameBoardSystem;
  private readonly logic: GameLogic;
  private readonly aiManager: AIManager;
  private readonly hud: GameHUD;
  private readonly onStatus?: (message: string) => void;

  private postMoveCancel: (() => void) | null = null;
  private aiCancel: (() => void) | null = null;
  private isAIThinking = false;

  constructor(options: TurnManagerOptions) {
    this.scheduler = options.scheduler;
    this.board = options.board;
    this.logic = options.logic;
    this.aiManager = options.aiManager;
    this.hud = options.hud;
    this.onStatus = options.onStatus;
  }

  start(): void {
    this.updateTurn();
    this.updateWinner();
    this.checkAITurn();
  }

  handlePlayerMoveCommitted(): void {
    this.board.clearHighlights();
    this.schedulePostMoveActions();
  }

  handleStateMutated(): void {
    this.updateTurn();
    this.updateWinner();
    this.checkAITurn();
  }

  isHumanTurnLocked(): boolean {
    const state = this.logic.getState();
    return this.isAIThinking || this.aiManager.isAIPlayer(state.currentPlayer);
  }

  cancel(): void {
    this.cancelPostMove();
    this.cancelAI();
    this.setAIThinking(false);
  }

  private schedulePostMoveActions(): void {
    this.cancelPostMove();
    this.postMoveCancel = this.scheduler.schedule(POST_MOVE_DELAY, () => {
      this.updateTurn();
      this.updateWinner();
      this.checkAITurn();
    });
  }

  private checkAITurn(): void {
    const state = this.logic.getState();
    const currentPlayer = state.currentPlayer;

    if (
      this.aiManager.isAIPlayer(currentPlayer) &&
      !this.isAIThinking &&
      !state.winner
    ) {
      this.engageAI(currentPlayer);
    }
  }

  private engageAI(player: Player): void {
    this.setAIThinking(true);
    this.aiCancel = this.scheduler.schedule(AI_THINKING_DELAY, () => {
      const move = this.aiManager.getAIMove(player, this.logic.getState().board);

      if (!move) {
        console.error('AI could not find a valid move');
        this.setAIThinking(false);
        return;
      }

      this.logic.selectPiece(move.from);
      this.board.movePiece(move.from, move.to);

      const moveSuccess = this.logic.movePiece(move.to);

      if (moveSuccess) {
        this.board.clearHighlights();
        this.setAIThinking(false);
        this.schedulePostMoveActions();
      } else {
        console.error('AI move failed');
        this.setAIThinking(false);
      }
    });
  }

  private updateTurn(): void {
    const state = this.logic.getState();
    this.hud.setTurn(state.currentPlayer);
  }

  private updateWinner(): void {
    const state = this.logic.getState();
    if (state.winner) {
      this.hud.showWinner(state.winner);
      this.onStatus?.(`${PlayerInfo.getName(state.winner)} wins!`);
    } else {
      this.hud.hideWinner();
    }
  }

  private setAIThinking(thinking: boolean): void {
    this.isAIThinking = thinking;
    this.hud.setAIThinking(thinking);
    if (thinking) {
      this.onStatus?.('AI is thinking…');
    }
  }

  private cancelPostMove(): void {
    if (this.postMoveCancel) {
      this.postMoveCancel();
      this.postMoveCancel = null;
    }
  }

  private cancelAI(): void {
    if (this.aiCancel) {
      this.aiCancel();
      this.aiCancel = null;
    }
  }
}
