import { ArcRotateCamera, Color3, HemisphericLight, Vector3 } from '@babylonjs/core';
import { Control, StackPanel, TextBlock } from '@babylonjs/gui';
import { BaseScene } from '../engine/BaseScene';
import { UIButton } from '../objects/ui/UIButton';
import type { GameMode } from '../config/setup';

export class MenuScene extends BaseScene {
  private buttons: UIButton[] = [];
  private container!: StackPanel;

  async onEnter(): Promise<void> {
    this.setupCameraAndLight();
    this.createUI();
    this.updateLayoutWidth();
  }

  override onResize(_width: number, _height: number): void {
    this.updateLayoutWidth();
  }

  override onExit(): void {
    this.buttons.forEach((button) => button.dispose());
    this.buttons = [];
  }

  private setupCameraAndLight(): void {
    const camera = new ArcRotateCamera(
      'menu-camera',
      Math.PI / 2,
      Math.PI / 2.6,
      12,
      new Vector3(0, 0, 0),
      this.scene
    );
    camera.attachControl(this.app.getCanvas(), true);
    camera.lowerRadiusLimit = 10;
    camera.upperRadiusLimit = 12;
    camera.panningAxis = Vector3.Zero();
    camera.inputs.clear();
    camera.allowUpsideDown = false;
    camera.useAutoRotationBehavior = false;

    const light = new HemisphericLight('menu-light', new Vector3(0, 1, 0), this.scene);
    light.diffuse = new Color3(1, 1, 1);
    light.groundColor = new Color3(0.1, 0.15, 0.2);
    light.intensity = 0.9;
  }

  private createUI(): void {
    this.container = new StackPanel('menu-container');
    this.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.container.isVertical = true;
    this.container.spacing = 40;
    this.container.clipChildren = false;

    const header = new StackPanel('menu-header');
    header.isVertical = true;
    header.spacing = 12;
    header.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    header.clipChildren = false;
    header.width = '100%';

    const title = new TextBlock('menu-title', 'Chinese Checkers');
    title.color = '#f8fafc';
    title.fontSize = 52;
    title.fontWeight = '700';
    title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    title.height = '72px';
    title.width = '100%';
    title.textWrapping = true;

    const subtitle = new TextBlock('menu-subtitle', 'Strategic board game for 2-6 players');
    subtitle.color = '#cbd5f5';
    subtitle.fontSize = 20;
    subtitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    subtitle.height = '32px';
    subtitle.width = '100%';
    subtitle.textWrapping = true;

    header.addControl(title);
    header.addControl(subtitle);

    const buttonGroup = new StackPanel('menu-buttons');
    buttonGroup.isVertical = true;
    buttonGroup.spacing = 24;
    buttonGroup.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;

    this.buttons = [
      new UIButton('Play vs AI', {
        width: 280,
        height: 64,
        backgroundColor: 0x10b981,
        hoverColor: 0x34d399,
        activeColor: 0x047857,
        fontSize: 22
      }, () => this.toSetup('ai')),
      new UIButton('Local Multiplayer', {
        width: 280,
        height: 64,
        backgroundColor: 0x6366f1,
        hoverColor: 0x818cf8,
        activeColor: 0x4338ca,
        fontSize: 22
      }, () => this.toSetup('multiplayer'))
    ];

    this.buttons.forEach((button) => {
      button.control.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      button.control.height = `${button.getHeight()}px`;
      buttonGroup.addControl(button.control);
    });

    this.container.addControl(header);
    this.container.addControl(buttonGroup);

    this.ui.addControl(this.container);
  }

  private async toSetup(mode: GameMode): Promise<void> {
    await this.app.goToSetup({ mode });
  }

  private updateLayoutWidth(): void {
    if (!this.container) {
      return;
    }
    const renderWidth = this.engine.getRenderWidth();
    const targetWidth = Math.min(600, Math.max(320, renderWidth * 0.7));
    this.container.width = `${targetWidth}px`;
  }
}
