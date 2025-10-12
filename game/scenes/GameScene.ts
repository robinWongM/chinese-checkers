import {
  ArcRotateCamera,
  Color3,
  HemisphericLight,
  PointerEventTypes,
  Vector3
} from '@babylonjs/core';
import { BaseScene } from '../engine/BaseScene';
import { Board } from '../objects/Board';
import { GameLogic } from '../objects/GameLogic';
import { AIManager } from '../managers/AIManager';
import { Player } from '../types';
import type { AIType, GameConfig, GameState, HexPosition } from '../types';
import {
  createLaunchSettings,
  type Difficulty,
  type GameLaunchSettings,
  type GameMode,
  type PlayerType
} from '../config/setup';
import { DEFAULT_2_PLAYER_CONFIG } from '../config/gameConfig';
import { GameHUD } from '../objects/ui/GameHUD';

const POST_MOVE_DELAY = 350;
const AI_THINKING_DELAY = 500;

export interface GameSceneData {
  setup?: GameLaunchSettings;
}

interface SetupMeta {
  mode: GameMode;
  playerCount: number;
  playerTypes: PlayerType[];
  aiDifficulty: Difficulty;
  aiType: AIType;
}

export class GameScene extends BaseScene {
  private camera!: ArcRotateCamera;
  private board!: Board;
  private gameLogic!: GameLogic;
  private aiManager!: AIManager;
  private hud!: GameHUD;
  private gameConfig!: GameConfig;
  private initialConfig!: GameConfig;
  private setupMeta!: SetupMeta;
  private isAIThinking = false;
  private aiTimeout: ReturnType<typeof setTimeout> | null = null;
  private postMoveTimeout: ReturnType<typeof setTimeout> | null = null;
  private hexSize = 1;

  async onEnter(data?: GameSceneData): Promise<void> {
    this.initializeState(data);
    this.setupCameraAndLight();
    this.setupBoard();
    this.setupLogic();
    this.setupHUD();
    this.setupPointerHandlers();
    this.emitTurnUpdate();
    this.updateWinState();
    this.checkAITurn();
  }

  override onResize(width: number, height: number): void {
    this.hexSize = this.calculateHexSize(width, height);
    this.board.resize(Vector3.Zero(), this.hexSize);
    this.updateCameraRadius();
    this.refreshHighlightsAfterResize();
  }

  override onExit(): void {
    this.cancelTimers();
    this.board?.dispose();
    this.hud?.dispose();
  }

  private initializeState(data: GameSceneData | undefined): void {
    const settings = data?.setup ?? createLaunchSettings({ gameConfig: DEFAULT_2_PLAYER_CONFIG });

    this.setupMeta = {
      mode: settings.mode,
      playerCount: settings.playerCount,
      playerTypes: [...settings.playerTypes],
      aiDifficulty: settings.aiDifficulty,
      aiType: settings.aiType
    };

    this.initialConfig = GameScene.cloneGameConfig(settings.gameConfig);
    this.gameConfig = GameScene.cloneGameConfig(settings.gameConfig);
  }

  private setupCameraAndLight(): void {
    const width = this.scene.getEngine().getRenderWidth();
    const height = this.scene.getEngine().getRenderHeight();
    this.hexSize = this.calculateHexSize(width, height);

    this.camera = new ArcRotateCamera(
      'game-camera',
      Math.PI / 6 * 4,
      0,
      Math.PI / 3,
      Vector3.Zero(),
      this.scene
    );
    this.camera.attachControl(this.app.getCanvas(), true);
    this.camera.allowUpsideDown = false;
    this.camera.useAutoRotationBehavior = false;
    this.camera.inputs.clear();
    this.updateCameraRadius();

    const light = new HemisphericLight('game-light', new Vector3(0, 1, 0), this.scene);
    light.diffuse = new Color3(1, 1, 1);
    light.groundColor = new Color3(0.1, 0.12, 0.16);
    light.specular = new Color3(0.5, 0.5, 0.5);
    light.intensity = 0.95;
  }

  private setupBoard(): void {
    this.board = new Board(this.scene, Vector3.Zero(), this.hexSize, this.gameConfig);
  }

  private setupLogic(): void {
    this.gameLogic = new GameLogic(this.board.getBoard(), this.gameConfig);
    this.aiManager = new AIManager(this.gameConfig);
  }

  private setupHUD(): void {
    this.hud = new GameHUD(this.ui, {
      onRestart: () => { void this.handleRestart(); },
      onNewGame: () => { void this.handleNewGame(); },
      onMenu: () => { void this.handleBackToMenu(); },
      onExport: () => { void this.handleExport(); },
      onImport: () => { void this.handleImport(); }
    });
    this.hud.layout();
  }

  private setupPointerHandlers(): void {
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type !== PointerEventTypes.POINTERDOWN) {
        return;
      }
      const pickInfo = pointerInfo.pickInfo;
      const mesh = pickInfo?.pickedMesh;
      const metadata = mesh?.metadata as
        | { type: 'piece' | 'highlight' | 'selection'; position: HexPosition }
        | undefined;

      if (!metadata) {
        this.gameLogic.deselectPiece();
        this.board.clearHighlights();
        return;
      }

      if (metadata.type === 'piece') {
        this.handlePieceSelection(metadata.position);
      } else if (metadata.type === 'highlight') {
        this.handleMove(metadata.position);
      }
    });
  }

  private emitTurnUpdate(): void {
    const state = this.gameLogic.getState();
    this.hud.setTurn(state.currentPlayer);
  }

  private setAIThinking(thinking: boolean): void {
    this.isAIThinking = thinking;
    this.hud.setAIThinking(thinking);
  }

  private setStatusMessage(message: string): void {
    this.hud.setStatusMessage(message);
  }

  private handlePieceSelection(pos: HexPosition): void {
    if (this.isAIThinking) {
      return;
    }

    if (this.aiManager.isAIPlayer(this.gameLogic.getState().currentPlayer)) {
      return;
    }

    const boardPos = this.board.getPositionAt(pos);
    const currentPlayer = this.gameLogic.getState().currentPlayer;
    if (!boardPos || boardPos.player !== currentPlayer) {
      return;
    }

    if (this.gameLogic.selectPiece(pos)) {
      this.board.clearHighlights();
      this.board.highlightSelected(pos);
      const validMoves = this.gameLogic.getState().validMoves;
      this.board.highlightPositions(validMoves);
    }
  }

  private handleMove(toPos: HexPosition): void {
    if (this.isAIThinking) {
      return;
    }

    const state = this.gameLogic.getState();
    const actualFromPos = state.selectedPosition;

    if (!actualFromPos) {
      return;
    }

    this.board.movePiece(actualFromPos, toPos);

    const moveSuccess = this.gameLogic.movePiece(toPos);

    if (moveSuccess) {
      this.board.clearHighlights();
      this.schedulePostMoveActions();
    }
  }

  private schedulePostMoveActions(): void {
    if (this.postMoveTimeout) {
      clearTimeout(this.postMoveTimeout);
    }
    this.postMoveTimeout = setTimeout(() => {
      this.emitTurnUpdate();
      this.updateWinState();
      this.checkAITurn();
    }, POST_MOVE_DELAY);
  }

  private checkAITurn(): void {
    const currentPlayer = this.gameLogic.getState().currentPlayer;

    if (
      this.aiManager.isAIPlayer(currentPlayer) &&
      !this.isAIThinking &&
      !this.gameLogic.getState().winner
    ) {
      this.makeAIMove();
    }
  }

  private makeAIMove(): void {
    this.setAIThinking(true);
    this.aiTimeout = setTimeout(() => {
      const currentPlayer = this.gameLogic.getState().currentPlayer;
      const move = this.aiManager.getAIMove(currentPlayer, this.gameLogic.getState().board);

      if (move) {
        this.gameLogic.selectPiece(move.from);
        this.board.movePiece(move.from, move.to);

        const moveSuccess = this.gameLogic.movePiece(move.to);

        if (moveSuccess) {
          this.postMoveTimeout = setTimeout(() => {
            this.setAIThinking(false);
            this.emitTurnUpdate();
            this.updateWinState();
            this.checkAITurn();
          }, POST_MOVE_DELAY);
        } else {
          this.setAIThinking(false);
          console.error('AI move failed');
        }
      } else {
        this.setAIThinking(false);
        console.error('AI could not find a valid move');
      }
    }, AI_THINKING_DELAY);
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
      this.cancelTimers();
      this.setAIThinking(false);
      this.board.clearHighlights();
      this.board.refreshPieces();
      this.emitTurnUpdate();
      this.updateWinState();
    }
    return success;
  }

  public getStateSnapshot(): GameState {
    return this.gameLogic.getState();
  }

  private getLaunchSettings(): GameLaunchSettings {
    return {
      mode: this.setupMeta.mode,
      playerCount: this.setupMeta.playerCount,
      playerTypes: [...this.setupMeta.playerTypes],
      aiDifficulty: this.setupMeta.aiDifficulty,
      aiType: this.setupMeta.aiType,
      gameConfig: GameScene.cloneGameConfig(this.initialConfig)
    };
  }

  private updateWinState(): void {
    const state = this.gameLogic.getState();
    if (state.winner) {
      this.hud.showWinner(state.winner);
    } else {
      this.hud.hideWinner();
    }
  }

  private refreshHighlightsAfterResize(): void {
    const state = this.gameLogic.getState();
    if (!state.selectedPosition) {
      return;
    }
    this.board.clearHighlights();
    this.board.highlightSelected(state.selectedPosition);
    this.board.highlightPositions(state.validMoves);
  }

  private updateCameraRadius(): void {
    const radius = this.hexSize * 32;
    this.camera.radius = radius;
  }

  private calculateHexSize(width: number, height: number): number {
    const scale = Math.min(width, height) / 900;
    return 1.2 * Math.max(0.5, scale);
  }

  private cancelTimers(): void {
    if (this.aiTimeout) {
      clearTimeout(this.aiTimeout);
      this.aiTimeout = null;
    }
    if (this.postMoveTimeout) {
      clearTimeout(this.postMoveTimeout);
      this.postMoveTimeout = null;
    }
  }

  private static cloneGameConfig(config: GameConfig): GameConfig {
    const activePlayers = [...config.activePlayers];
    const playerConfigs = activePlayers.map((player) => {
      const existing = config.playerConfigs?.find((pc) => pc.player === player);
      if (existing?.isAI) {
        return {
          player,
          isAI: true,
          aiType: existing.aiType ?? 'greedy',
          aiDifficulty: existing.aiDifficulty ?? 'medium'
        };
      }
      return {
        player,
        isAI: false
      };
    });

    return {
      playerCount: activePlayers.length,
      activePlayers,
      playerConfigs
    };
  }
}
