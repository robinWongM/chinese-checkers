import { BaseScene } from '../engine/BaseScene';
import { GameLogic } from '../logic/GameLogic';
import { AIManager } from '../managers/AIManager';
import type { GameConfig, GameState, HexPosition } from '../types';
import type { GameLaunchSettings } from '../config/setup';
import { GameSession } from '../config/GameSession';
import { GameHUD } from '../ui/GameHUD';
import { GameCameraRig } from '../systems/GameCameraRig';
import { GameBoardSystem } from '../systems/GameBoardSystem';
import { PointerInputSystem } from '../systems/PointerInputSystem';
import { FrameScheduler } from '../systems/FrameScheduler';
import { TurnManager } from '../systems/TurnManager';

const MIN_HEX_SCALE = 0.5;
const BASE_VIEWPORT_SIZE = 900;

export interface GameSceneData {
  setup?: GameLaunchSettings;
}

export class GameScene extends BaseScene {
  private cameraRig!: GameCameraRig;
  private boardSystem!: GameBoardSystem;
  private gameLogic!: GameLogic;
  private aiManager!: AIManager;
  private hud!: GameHUD;
  private scheduler!: FrameScheduler;
  private pointerSystem!: PointerInputSystem;
  private turnManager!: TurnManager;
  private session!: GameSession;
  private gameConfig!: GameConfig;
  private hexSize = 1;

  async onEnter(data?: GameSceneData): Promise<void> {
    this.initializeState(data);
    this.bootstrapSystems();
    this.pointerSystem = new PointerInputSystem(this.scene, this.boardSystem, {
      onPiece: (position) => this.handlePieceSelection(position),
      onHighlight: (position) => this.handleMove(position),
      onEmpty: () => {
        this.gameLogic.deselectPiece();
        this.boardSystem.clearHighlights();
      }
    });
    this.turnManager.start();
  }

  override onResize(width: number, height: number): void {
    this.hexSize = this.calculateHexSize(width, height);
    this.boardSystem.resize(this.hexSize);
    this.cameraRig.updateForHexSize(this.hexSize);
    this.refreshHighlightsAfterResize();
  }

  override onExit(): void {
    this.pointerSystem?.dispose();
    this.turnManager?.cancel();
    this.scheduler?.dispose();
    this.boardSystem?.dispose();
    this.cameraRig?.dispose();
    this.hud?.dispose();
  }

  private initializeState(data: GameSceneData | undefined): void {
    this.session = GameSession.create(data?.setup ?? null);
  }

  private bootstrapSystems(): void {
    const width = this.scene.getEngine().getRenderWidth();
    const height = this.scene.getEngine().getRenderHeight();
    this.hexSize = this.calculateHexSize(width, height);

    this.cameraRig = new GameCameraRig(this.scene, this.app.getCanvas());
    this.cameraRig.updateForHexSize(this.hexSize);

    this.gameConfig = this.session.createRuntimeConfig();
    this.boardSystem = new GameBoardSystem(this.scene, this.hexSize, this.gameConfig);
    this.gameLogic = new GameLogic(this.boardSystem.getState(), this.gameConfig);
    this.aiManager = new AIManager(this.gameConfig);

    this.hud = new GameHUD(this.ui, {
      onRestart: () => { void this.handleRestart(); },
      onNewGame: () => { void this.handleNewGame(); },
      onMenu: () => { void this.handleBackToMenu(); },
      onExport: () => { void this.handleExport(); },
      onImport: () => { void this.handleImport(); }
    });
    this.hud.layout();

    this.scheduler = new FrameScheduler(this.scene);
    this.turnManager = new TurnManager({
      scheduler: this.scheduler,
      board: this.boardSystem,
      logic: this.gameLogic,
      aiManager: this.aiManager,
      hud: this.hud,
      onStatus: (message) => this.hud.setStatusMessage(message)
    });
  }

  private setStatusMessage(message: string): void {
    this.hud.setStatusMessage(message);
  }

  private handlePieceSelection(pos: HexPosition): void {
    if (this.turnManager.isHumanTurnLocked()) {
      return;
    }

    const currentPlayer = this.gameLogic.getState().currentPlayer;
    const boardPos = this.boardSystem.getPositionAt(pos);
    if (!boardPos || boardPos.player !== currentPlayer) {
      return;
    }

    if (this.gameLogic.selectPiece(pos)) {
      this.boardSystem.clearHighlights();
      this.boardSystem.highlightSelected(pos);
      const validMoves = this.gameLogic.getState().validMoves;
      this.boardSystem.highlightPositions(validMoves);
    }
  }

  private handleMove(toPos: HexPosition): void {
    if (this.turnManager.isHumanTurnLocked()) {
      return;
    }

    const state = this.gameLogic.getState();
    const actualFromPos = state.selectedPosition;

    if (!actualFromPos) {
      return;
    }

    this.boardSystem.movePiece(actualFromPos, toPos);
    const moveSuccess = this.gameLogic.movePiece(toPos);

    if (moveSuccess) {
      this.turnManager.handlePlayerMoveCommitted();
    }
  }

  private async handleRestart(): Promise<void> {
    this.setStatusMessage('Game restarted.');
    await this.app.goToGame({ setup: this.getLaunchSettings() });
  }

  private async handleNewGame(): Promise<void> {
    await this.app.goToSetup({ settings: this.getLaunchSettings() });
  }

  private async handleBackToMenu(): Promise<void> {
    await this.app.goToMenu();
  }

  private async handleExport(): Promise<void> {
    const serialized = this.getSerializedState();
    try {
      await navigator.clipboard.writeText(serialized);
      this.setStatusMessage('Board state copied to clipboard.');
    } catch (error) {
      console.error('Failed to copy board state', error);
      window.prompt('Copy board state JSON', serialized);
      this.setStatusMessage('Copy failed. JSON ready to copy manually.');
    }
  }

  private async handleImport(): Promise<void> {
    let data: string | null = null;
    try {
      data = await navigator.clipboard.readText();
    } catch (error) {
      console.error('Failed to read clipboard', error);
    }

    if (!data) {
      data = window.prompt('Paste the board state JSON');
    }

    if (!data) {
      this.setStatusMessage('Import cancelled.');
      return;
    }

    const success = this.applySerializedState(data);
    this.setStatusMessage(success ? 'Board state imported.' : 'Import failed. Check JSON and try again.');
  }

  public getSerializedState(): string {
    return this.gameLogic.exportState();
  }

  public applySerializedState(serialized: string): boolean {
    const success = this.gameLogic.importState(serialized);
    if (success) {
      this.turnManager.cancel();
      this.boardSystem.clearHighlights();
      this.boardSystem.refreshPieces();
      this.turnManager.handleStateMutated();
    }
    return success;
  }

  public getStateSnapshot(): GameState {
    return this.gameLogic.getState();
  }

  private getLaunchSettings(): GameLaunchSettings {
    return this.session.toLaunchSettings();
  }

  private refreshHighlightsAfterResize(): void {
    const state = this.gameLogic.getState();
    if (!state.selectedPosition) {
      return;
    }
    this.boardSystem.clearHighlights();
    this.boardSystem.highlightSelected(state.selectedPosition);
    this.boardSystem.highlightPositions(state.validMoves);
  }

  private calculateHexSize(width: number, height: number): number {
    const scale = Math.min(width, height) / BASE_VIEWPORT_SIZE;
    return 1.2 * Math.max(MIN_HEX_SCALE, scale);
  }

}
