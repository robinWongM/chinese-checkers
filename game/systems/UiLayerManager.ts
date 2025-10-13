import { AdvancedDynamicTexture } from '@babylonjs/gui';
import type { Scene } from '@babylonjs/core';

export class UiLayerManager {
  static createUI(scene: Scene, name = 'ui'): AdvancedDynamicTexture {
    return AdvancedDynamicTexture.CreateFullscreenUI(name, true, scene);
  }
}
