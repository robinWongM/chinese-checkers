import { StackPanel, TextBlock, Control } from '@babylonjs/gui';
import type { AdvancedDynamicTexture } from '@babylonjs/gui';
import type { Player } from '../../types';
import { PlayerInfo } from '../../types';
import { UIButton } from './UIButton';

export interface GameHUDCallbacks {
  onRestart: () => void;
  onNewGame: () => void;
  onMenu: () => void;
  onExport: () => void;
  onImport: () => void;
}

const topTextStyle = {
  color: '#e2e8f0',
  fontSize: 24,
  fontWeight: '600'
};

const statusTextStyle = {
  color: '#cbd5f5',
  fontSize: 18,
  fontWeight: '400'
};

const toHex = (value: number): string =>
  `#${Math.max(0, Math.min(0xffffff, value)).toString(16).padStart(6, '0')}`;

export class GameHUD {
  private readonly root: StackPanel;
  private readonly buttonPanel: StackPanel;
  private readonly turnText: TextBlock;
  private readonly winnerText: TextBlock;
  private readonly thinkingText: TextBlock;
  private readonly statusText: TextBlock;
  private readonly buttons: UIButton[];
  private statusTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    ui: AdvancedDynamicTexture,
    callbacks: GameHUDCallbacks
  ) {
    const container = new StackPanel('hud-root');
    container.width = '100%';
    container.isVertical = true;
    container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    container.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    container.top = '24px';
    container.spacing = 6;

    this.turnText = new TextBlock('hud-turn', 'Preparing game…');
    this.turnText.color = topTextStyle.color;
    this.turnText.fontSize = topTextStyle.fontSize;
    this.turnText.fontWeight = topTextStyle.fontWeight;
    this.turnText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;

    this.winnerText = new TextBlock('hud-winner', '');
    this.winnerText.color = topTextStyle.color;
    this.winnerText.fontSize = 26;
    this.winnerText.fontWeight = '700';
    this.winnerText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.winnerText.alpha = 0;

    this.thinkingText = new TextBlock('hud-thinking', 'AI is thinking…');
    this.thinkingText.color = statusTextStyle.color;
    this.thinkingText.fontSize = 16;
    this.thinkingText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.thinkingText.isVisible = false;

    this.statusText = new TextBlock('hud-status', '');
    this.statusText.color = statusTextStyle.color;
    this.statusText.fontSize = statusTextStyle.fontSize;
    this.statusText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.statusText.alpha = 0;

    container.addControl(this.turnText);
    container.addControl(this.winnerText);
    container.addControl(this.thinkingText);
    container.addControl(this.statusText);

    const buttons = [
      new UIButton('Restart', {
        width: 140,
        height: 48,
        backgroundColor: 0x3b82f6,
        hoverColor: 0x60a5fa,
        activeColor: 0x2563eb,
        fontSize: 16
      }, callbacks.onRestart),
      new UIButton('New Game', {
        width: 140,
        height: 48,
        backgroundColor: 0x6366f1,
        hoverColor: 0x818cf8,
        activeColor: 0x4338ca,
        fontSize: 16
      }, callbacks.onNewGame),
      new UIButton('Main Menu', {
        width: 150,
        height: 48,
        backgroundColor: 0x475569,
        hoverColor: 0x64748b,
        activeColor: 0x1f2937,
        fontSize: 16
      }, callbacks.onMenu),
      new UIButton('Export', {
        width: 140,
        height: 48,
        backgroundColor: 0x22c55e,
        hoverColor: 0x4ade80,
        activeColor: 0x15803d,
        fontSize: 16
      }, callbacks.onExport),
      new UIButton('Import', {
        width: 140,
        height: 48,
        backgroundColor: 0xf97316,
        hoverColor: 0xfdba74,
        activeColor: 0xc2410c,
        fontSize: 16
      }, callbacks.onImport)
    ];

    this.buttonPanel = new StackPanel('hud-buttons');
    this.buttonPanel.isVertical = false;
    this.buttonPanel.height = '64px';
    this.buttonPanel.width = '100%';
    this.buttonPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.buttonPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.buttonPanel.paddingBottom = '24px';
    this.buttonPanel.spacing = 16;

    buttons.forEach((button) => {
      button.control.width = `${button.getWidth()}px`;
      button.control.height = `${button.getHeight()}px`;
      button.control.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      this.buttonPanel.addControl(button.control);
    });

    this.root = container;
    this.buttons = buttons;

    ui.addControl(container);
    ui.addControl(this.buttonPanel);
  }

  public setTurn(player: Player | null): void {
    if (player === null) {
      this.turnText.text = 'Preparing game…';
      this.turnText.color = topTextStyle.color;
      return;
    }
    const colorHex = toHex(PlayerInfo.getColor(player));
    this.turnText.text = `${PlayerInfo.getName(player)}'s Turn`;
    this.turnText.color = colorHex;
  }

  public showWinner(player: Player): void {
    const colorHex = toHex(PlayerInfo.getColor(player));
    this.winnerText.text = `${PlayerInfo.getName(player)} Wins!`;
    this.winnerText.color = colorHex;
    this.winnerText.alpha = 1;
  }

  public hideWinner(): void {
    this.winnerText.text = '';
    this.winnerText.alpha = 0;
  }

  public setAIThinking(thinking: boolean): void {
    this.thinkingText.isVisible = thinking;
  }

  public setStatusMessage(message: string): void {
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
      this.statusTimer = null;
    }

    if (!message) {
      this.statusText.text = '';
      this.statusText.alpha = 0;
      return;
    }

    this.statusText.text = message;
    this.statusText.alpha = 1;

    this.statusTimer = setTimeout(() => {
      this.statusText.alpha = 0;
      this.statusText.text = '';
      this.statusTimer = null;
    }, 3000);
  }

  public layout(): void {
    // Babylon GUI handles layout automatically.
  }

  public dispose(): void {
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
      this.statusTimer = null;
    }
    this.buttons.forEach((button) => button.dispose());
    this.buttonPanel.dispose();
    this.root.dispose();
  }
}
