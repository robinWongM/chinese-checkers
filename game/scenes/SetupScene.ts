import {
  ArcRotateCamera,
  Color3,
  HemisphericLight,
  Vector3
} from '@babylonjs/core';
import {
  Control,
  Ellipse,
  Grid,
  Rectangle,
  StackPanel,
  TextBlock
} from '@babylonjs/gui';
import { BaseScene } from '../engine/BaseScene';
import type { AIType } from '../types';
import { Player, PlayerInfo } from '../types';
import {
  createLaunchSettings,
  type Difficulty,
  type GameLaunchSettings,
  type GameMode,
  type GameSetupOptions,
  type PlayerType
} from '../config/setup';
import { UIButton } from '../objects/ui/UIButton';

export interface SetupSceneData {
  mode?: GameMode;
  playerCount?: number;
  playerTypes?: PlayerType[];
  aiDifficulty?: Difficulty;
  aiType?: AIType;
  settings?: GameLaunchSettings;
}

interface PlayerRow {
  container: Rectangle;
  color: Ellipse;
  name: TextBlock;
  toggle: UIButton;
}

export class SetupScene extends BaseScene {
  private mode: GameMode = 'multiplayer';
  private aiDifficulty: Difficulty = 'medium';
  private aiType: AIType = 'greedy';
  private playerCount = 2;
  private playerTypes: PlayerType[] = [];
  private launchSettings!: GameLaunchSettings;

  private mainPanel!: StackPanel;
  private title!: TextBlock;
  private subtitle!: TextBlock;

  private playerCountSection!: StackPanel;
  private playerCountButtons: UIButton[] = [];

  private difficultySection!: StackPanel;
  private difficultyButtons: UIButton[] = [];

  private playerSection!: StackPanel;
  private playerRowsContainer: StackPanel | null = null;
  private playerRows: PlayerRow[] = [];

  private startButton!: UIButton;
  private backButton!: UIButton;
  private footerPanel!: StackPanel;
  private rootContainer: Rectangle | null = null;

  async onEnter(data?: SetupSceneData): Promise<void> {
    this.setupCameraAndLight();
    this.initializeState(data);
    this.createLayout();
    this.updateControls();
    this.updateLayoutWidth();
  }

  override onExit(): void {
    this.disposeButtons();
    this.rootContainer?.dispose();
    this.rootContainer = null;
  }

  private setupCameraAndLight(): void {
    const camera = new ArcRotateCamera(
      'setup-camera',
      Math.PI / 2.4,
      Math.PI / 2.5,
      16,
      new Vector3(0, 0, 0),
      this.scene
    );
    camera.attachControl(this.app.getCanvas(), true);
    camera.inputs.clear();
    camera.allowUpsideDown = false;
    camera.useAutoRotationBehavior = false;

    const light = new HemisphericLight('setup-light', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.8;
    light.diffuse = new Color3(1, 1, 1);
    light.groundColor = new Color3(0.1, 0.15, 0.2);
  }

  private initializeState(data: SetupSceneData | undefined): void {
    const baseOptions: GameSetupOptions | null =
      data?.settings
        ? {
            mode: data.settings.mode,
            playerCount: data.settings.playerCount,
            playerTypes: data.settings.playerTypes,
            aiDifficulty: data.settings.aiDifficulty,
            aiType: data.settings.aiType,
            gameConfig: data.settings.gameConfig
          }
        : data
          ? {
              mode: data.mode,
              playerCount: data.playerCount,
              playerTypes: data.playerTypes,
              aiDifficulty: data.aiDifficulty,
              aiType: data.aiType
            }
          : null;

    this.launchSettings = createLaunchSettings(baseOptions);
    this.mode = this.launchSettings.mode;
    this.playerCount = this.launchSettings.playerCount;
    this.playerTypes = [...this.launchSettings.playerTypes];
    this.aiDifficulty = this.launchSettings.aiDifficulty;
    this.aiType = this.launchSettings.aiType;
  }

  private createLayout(): void {
    this.rootContainer = new Rectangle('setup-root');
    this.rootContainer.thickness = 0;
    this.rootContainer.cornerRadius = 28;
    this.rootContainer.background = '#111c33';
    this.rootContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.rootContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.rootContainer.top = '40px';
    this.rootContainer.paddingLeft = '32px';
    this.rootContainer.paddingRight = '32px';
    this.rootContainer.paddingTop = '32px';
    this.rootContainer.paddingBottom = '48px';
    this.rootContainer.clipChildren = false;
    this.rootContainer.adaptHeightToChildren = true;

    this.mainPanel = new StackPanel('setup-panel');
    this.mainPanel.isVertical = true;
    this.mainPanel.spacing = 28;
    this.mainPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.mainPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.mainPanel.clipChildren = false;
    this.mainPanel.adaptHeightToChildren = true;
    this.mainPanel.width = '100%';

    this.rootContainer.addControl(this.mainPanel);
    this.ui.addControl(this.rootContainer);

    this.createHeader();
    this.createPlayerCountSection();
    this.createDifficultySection();
    this.createPlayerConfigSection();
    this.createFooterButtons();
  }

  private createHeader(): void {
    this.title = new TextBlock('setup-title', 'Chinese Checkers');
    this.title.color = '#f8fafc';
    this.title.fontSize = 48;
    this.title.fontWeight = '700';
    this.title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.title.width = '100%';
    this.title.textWrapping = true;

    this.subtitle = new TextBlock('setup-subtitle', '');
    this.subtitle.color = '#cbd5f5';
    this.subtitle.fontSize = 22;
    this.subtitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.subtitle.width = '100%';
    this.subtitle.textWrapping = true;

    const headerPanel = new StackPanel('setup-header');
    headerPanel.isVertical = true;
    headerPanel.spacing = 8;
    headerPanel.width = '100%';
    headerPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    headerPanel.adaptHeightToChildren = true;

    this.title.height = '64px';
    this.subtitle.height = '36px';

    headerPanel.addControl(this.title);
    headerPanel.addControl(this.subtitle);

    this.mainPanel.addControl(headerPanel);
  }

  private createPlayerCountSection(): void {
    this.playerCountSection = new StackPanel('player-count-section');
    this.playerCountSection.isVertical = true;
    this.playerCountSection.width = '100%';
    this.playerCountSection.spacing = 16;
    this.playerCountSection.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.playerCountSection.adaptHeightToChildren = true;

    const label = new TextBlock('player-count-label', 'Number of Players');
    label.fontSize = 20;
    label.color = '#e2e8f0';
    label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    label.height = '28px';

    const buttonRow = new StackPanel('player-count-buttons');
    buttonRow.isVertical = false;
    buttonRow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    buttonRow.spacing = 16;
    buttonRow.height = '60px';

    const counts = [2, 3, 4, 6];
    this.playerCountButtons = counts.map((count) => {
      const button = new UIButton(
        `${count}`,
        {
          width: 76,
          height: 48,
          backgroundColor: 0x1f2937,
          hoverColor: 0x334155,
          activeColor: 0x2563eb,
          fontSize: 18,
          toggle: true
        },
        () => this.handlePlayerCount(count)
      );
      buttonRow.addControl(button.control);
      return button;
    });

    this.playerCountSection.addControl(label);
    this.playerCountSection.addControl(buttonRow);
    this.mainPanel.addControl(this.playerCountSection);
  }

  private createDifficultySection(): void {
    this.difficultySection = new StackPanel('difficulty-section');
    this.difficultySection.isVertical = true;
    this.difficultySection.spacing = 16;
    this.difficultySection.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.difficultySection.width = '100%';
    this.difficultySection.adaptHeightToChildren = true;

    const label = new TextBlock('difficulty-label', 'AI Difficulty');
    label.fontSize = 20;
    label.color = '#e2e8f0';
    label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    label.height = '28px';

    const buttonColumn = new StackPanel('difficulty-buttons');
    buttonColumn.isVertical = true;
    buttonColumn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    buttonColumn.spacing = 12;
    buttonColumn.adaptHeightToChildren = true;

    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    this.difficultyButtons = difficulties.map((difficulty) => {
      const button = new UIButton(
        difficulty.toUpperCase(),
        {
          width: 220,
          height: 52,
          backgroundColor: 0x1f2937,
          hoverColor: 0x334155,
          activeColor: 0x22c55e,
          fontSize: 18,
          toggle: true
        },
        () => this.handleDifficulty(difficulty)
      );
      buttonColumn.addControl(button.control);
      return button;
    });

    this.difficultySection.addControl(label);
    this.difficultySection.addControl(buttonColumn);
    this.mainPanel.addControl(this.difficultySection);
  }

  private createPlayerConfigSection(): void {
    this.playerSection = new StackPanel('player-config-section');
    this.playerSection.isVertical = true;
    this.playerSection.spacing = 16;
    this.playerSection.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.playerSection.clipChildren = false;
    this.playerSection.width = '100%';
    this.playerSection.adaptHeightToChildren = true;

    const label = new TextBlock('player-config-label', 'Player Configuration');
    label.fontSize = 20;
    label.color = '#e2e8f0';
    label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    label.height = '28px';

    this.playerSection.addControl(label);
    this.mainPanel.addControl(this.playerSection);
  }

  private createFooterButtons(): void {
    this.footerPanel = new StackPanel('setup-footer');
    this.footerPanel.isVertical = true;
    this.footerPanel.width = '100%';
    this.footerPanel.spacing = 20;
    this.footerPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.footerPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.footerPanel.clipChildren = false;
    this.footerPanel.paddingTop = '32px';
    this.footerPanel.adaptHeightToChildren = true;

    this.startButton = new UIButton(
      'Start Game',
      {
        width: 320,
        height: 68,
        backgroundColor: 0x22c55e,
        hoverColor: 0x4ade80,
        activeColor: 0x15803d,
        fontSize: 24
      },
      () => this.startGame()
    );
    this.footerPanel.addControl(this.startButton.control);

    this.backButton = new UIButton(
      'Back to Menu',
      {
        width: 220,
        height: 52,
        backgroundColor: 0x475569,
        hoverColor: 0x64748b,
        activeColor: 0x1f2937,
        fontSize: 18
      },
      () => void this.app.goToMenu()
    );
    this.footerPanel.addControl(this.backButton.control);

    this.mainPanel.addControl(this.footerPanel);
  }

  private updateControls(): void {
    this.subtitle.text =
      this.mode === 'ai' ? 'Play vs AI Setup' : 'Local Multiplayer Setup';

    const showPlayerCount = this.mode === 'multiplayer';
    this.playerCountSection.isVisible = showPlayerCount;
    this.playerCountButtons.forEach((button, index) => {
      button.setChecked(showPlayerCount && this.playerCount === [2, 3, 4, 6][index]);
      button.setEnabled(showPlayerCount);
    });

    const showDifficulty = this.mode === 'ai' || this.playerTypes.includes('ai');
    this.difficultySection.isVisible = showDifficulty;
    this.difficultyButtons.forEach((button, index) => {
      const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
      button.setChecked(showDifficulty && this.aiDifficulty === difficulties[index]);
      button.setEnabled(showDifficulty);
    });

    this.renderPlayerRows();
  }

  private renderPlayerRows(): void {
    this.playerRows.forEach((row) => {
      row.toggle.dispose();
      row.container.dispose();
    });
    this.playerRows = [];

    this.playerRowsContainer?.dispose();
    this.playerRowsContainer = null;

    const activePlayers = this.launchSettings.gameConfig.activePlayers;
    const container = new StackPanel('player-rows');
    container.isVertical = true;
    container.width = '100%';
    container.spacing = 12;
    container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    container.clipChildren = false;
    container.adaptHeightToChildren = true;

    activePlayers.forEach((player, index) => {
      const row = this.createPlayerRow(player, index);
      container.addControl(row.container);
      this.playerRows.push(row);
    });

    this.playerSection.addControl(container);
    this.playerRowsContainer = container;
    this.updatePlayerRowStyles();
    this.updateLayoutWidth();
  }

  private createPlayerRow(player: Player, index: number): PlayerRow {
    const wrapper = new Rectangle(`player-row-${index}`);
    wrapper.width = '100%';
    wrapper.height = '64px';
    wrapper.thickness = 0;
    wrapper.cornerRadius = 16;
    wrapper.background = '#1f2937';
    wrapper.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    wrapper.paddingLeft = '16px';
    wrapper.paddingRight = '16px';
    wrapper.clipChildren = false;
    wrapper.adaptHeightToChildren = true;

    const row = new Grid(`player-row-grid-${index}`);
    row.width = '100%';
    row.height = '64px';
    row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;

    row.addColumnDefinition(40, true);
    row.addColumnDefinition(1, false);
    row.addColumnDefinition(160, true);
    row.addRowDefinition(1, false);

    const color = new Ellipse(`player-color-${index}`);
    color.width = '20px';
    color.height = '20px';
    color.thickness = 0;
    color.background = `#${PlayerInfo.getColor(player).toString(16).padStart(6, '0')}`;
    color.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    color.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

    const name = new TextBlock(`player-name-${index}`, PlayerInfo.getName(player));
    name.fontSize = 18;
    name.color = '#e2e8f0';
    name.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    name.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

    const button = new UIButton(
      '',
      {
        width: 150,
        height: 48,
        backgroundColor: 0x2563eb,
        hoverColor: 0x3b82f6,
        activeColor: 0x1d4ed8,
        fontSize: 16
      },
      () => this.togglePlayerType(index)
    );
    button.control.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;

    row.addControl(color, 0, 0);
    row.addControl(name, 0, 1);
    row.addControl(button.control, 0, 2);

    wrapper.addControl(row);

    return {
      container: wrapper,
      color,
      name,
      toggle: button
    };
  }

  private updatePlayerRowStyles(): void {
    this.playerRows.forEach((row, index) => {
      const type = this.playerTypes[index] ?? 'human';
      row.toggle.setText(type === 'ai' ? 'AI' : 'Human');

      if (type === 'ai') {
        row.toggle.setColors({
          backgroundColor: 0x7c3aed,
          hoverColor: 0x9d4edd,
          activeColor: 0x5b21b6
        });
      } else {
        row.toggle.setColors({
          backgroundColor: 0x2563eb,
          hoverColor: 0x3b82f6,
          activeColor: 0x1d4ed8
        });
      }

      row.toggle.setEnabled(this.mode === 'multiplayer');
    });
  }

  private handlePlayerCount(count: number): void {
    if (this.mode !== 'multiplayer') {
      return;
    }
    this.playerCount = count;
    this.refreshLaunchSettings();
  }

  private handleDifficulty(difficulty: Difficulty): void {
    this.aiDifficulty = difficulty;
    this.refreshLaunchSettings();
  }

  private togglePlayerType(index: number): void {
    if (this.mode !== 'multiplayer') {
      return;
    }
    this.playerTypes[index] = this.playerTypes[index] === 'ai' ? 'human' : 'ai';
    this.refreshLaunchSettings();
  }

  private refreshLaunchSettings(): void {
    this.launchSettings = createLaunchSettings({
      mode: this.mode,
      playerCount: this.playerCount,
      playerTypes: this.playerTypes,
      aiDifficulty: this.aiDifficulty,
      aiType: this.aiType
    });
    this.playerCount = this.launchSettings.playerCount;
    this.playerTypes = [...this.launchSettings.playerTypes];
    this.updateControls();
  }

  private async startGame(): Promise<void> {
    await this.app.goToGame({ setup: this.launchSettings });
  }

  private disposeButtons(): void {
    [
      ...this.playerCountButtons,
      ...this.difficultyButtons,
      ...this.playerRows.map((row) => row.toggle),
      this.startButton,
      this.backButton
    ].forEach((button) => button?.dispose());
    this.playerCountButtons = [];
    this.difficultyButtons = [];
    this.playerRows = [];
    this.playerRowsContainer?.dispose();
    this.playerRowsContainer = null;
    if (this.footerPanel?.parent) {
      this.footerPanel.parent.removeControl(this.footerPanel);
    }
    this.mainPanel?.addControl(this.footerPanel);
  }

  override onResize(_width: number, _height: number): void {
    this.updateLayoutWidth();
  }

  private updateLayoutWidth(): void {
    const renderWidth = this.engine.getRenderWidth();
    const targetWidth = Math.min(720, Math.max(360, renderWidth * 0.8));
    if (this.rootContainer) {
      this.rootContainer.width = `${targetWidth + 64}px`;
    }
    if (this.mainPanel) {
      this.mainPanel.width = `${targetWidth}px`;
    }
    if (this.playerRowsContainer) {
      this.playerRowsContainer.width = '100%';
    }
  }
}
