import { Engine, Scene } from '@babylonjs/core';
import '@babylonjs/inspector';
import { BaseScene } from './BaseScene';
import { MenuScene } from '../scenes/MenuScene';
import { SetupScene, type SetupSceneData } from '../scenes/SetupScene';
import { GameScene, type GameSceneData } from '../scenes/GameScene';

export interface SceneContextMap {
  MenuScene: undefined;
  SetupScene: SetupSceneData | undefined;
  GameScene: GameSceneData | undefined;
}

export type SceneKey = keyof SceneContextMap;

type SceneInstance = BaseScene & { scene: Scene };

export class BabylonGame {
  private readonly engine: Engine;
  private currentScene: SceneInstance | null = null;
  private currentKey: SceneKey | null = null;
  private disposed = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      adaptToDeviceRatio: true,
      preserveDrawingBuffer: true,
      stencil: true,
    });
    this.handleResize = this.handleResize.bind(this);
  }

  async init(): Promise<void> {
    await this.switchScene('MenuScene');
    this.engine.runRenderLoop(() => {
      this.currentScene?.scene.render();
    });
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  async switchScene<K extends SceneKey>(key: K, data?: SceneContextMap[K]): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.currentScene?.dispose();

    const scene = new Scene(this.engine);
    let nextScene: SceneInstance;

    switch (key) {
      case 'MenuScene':
        nextScene = new MenuScene(this, scene);
        break;
      case 'SetupScene':
        nextScene = new SetupScene(this, scene);
        break;
      case 'GameScene':
        nextScene = new GameScene(this, scene);
        break;
      default: {
        const exhaustiveCheck: never = key;
        throw new Error(`Unknown scene key: ${exhaustiveCheck}`);
      }
    }

    this.currentScene = nextScene;
    this.currentKey = key;
    await nextScene.onEnter(data);
    this.showInspector(nextScene.scene);
  }

  async goToMenu(): Promise<void> {
    await this.switchScene('MenuScene');
  }

  async goToSetup(data?: SetupSceneData): Promise<void> {
    await this.switchScene('SetupScene', data);
  }

  async goToGame(data?: GameSceneData): Promise<void> {
    await this.switchScene('GameScene', data);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    window.removeEventListener('resize', this.handleResize);
    this.engine.stopRenderLoop();
    this.currentScene?.dispose();
    this.engine.dispose();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  private handleResize(): void {
    if (this.disposed) {
      return;
    }
    this.engine.resize();
    const width = this.canvas.clientWidth ?? this.canvas.width;
    const height = this.canvas.clientHeight ?? this.canvas.height;
    this.currentScene?.onResize(width, height);
  }

  private showInspector(scene: Scene): void {
    if (!import.meta.env.DEV) {
      return;
    }
    void scene.debugLayer.show({ embedMode: true });
  }
}
