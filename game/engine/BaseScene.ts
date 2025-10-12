import { Color4, Engine, Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture } from '@babylonjs/gui';
import type { BabylonGame } from './BabylonGame';

export abstract class BaseScene {
  protected readonly ui: AdvancedDynamicTexture;

  constructor(protected readonly app: BabylonGame, public readonly scene: Scene) {
    this.scene.clearColor = new Color4(15 / 255, 23 / 255, 42 / 255, 1);
    this.ui = AdvancedDynamicTexture.CreateFullscreenUI('ui', true, scene);
  }

  abstract onEnter(data?: unknown): Promise<void> | void;

  onExit(): void {
    // Optional override
  }

  onResize(_width: number, _height: number): void {
    // Optional override
  }

  dispose(): void {
    this.onExit();
    this.ui.dispose();
    this.scene.dispose();
  }

  protected get engine(): Engine {
    return this.scene.getEngine() as Engine;
  }
}
