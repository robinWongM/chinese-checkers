import type { Scene } from '@babylonjs/core';
import { MenuScene } from '../scenes/MenuScene';
import { SetupScene, type SetupSceneData } from '../scenes/SetupScene';
import { GameScene, type GameSceneData } from '../scenes/GameScene';
import type { BabylonGame, SceneContextMap, SceneKey } from './BabylonGame';
import type { BaseScene } from './BaseScene';

export type SceneFactory<K extends SceneKey> = (
  game: BabylonGame,
  scene: Scene
) => BaseScene & { onEnter(data?: SceneContextMap[K]): Promise<void> | void };

const SCENE_FACTORIES: { [K in SceneKey]: SceneFactory<K> } = {
  MenuScene: (game, scene) => new MenuScene(game, scene),
  SetupScene: (game, scene) => new SetupScene(game, scene),
  GameScene: (game, scene) => new GameScene(game, scene)
};

export const createSceneInstance = <K extends SceneKey>(
  key: K,
  game: BabylonGame,
  scene: Scene
): ReturnType<SceneFactory<K>> => {
  const factory = SCENE_FACTORIES[key];
  if (!factory) {
    throw new Error(`Unknown scene key: ${String(key)}`);
  }
  return factory(game, scene);
};
