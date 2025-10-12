import { BabylonGame } from './engine/BabylonGame';

export type GameApp = BabylonGame;

export const createGameApp = async (canvas: HTMLCanvasElement): Promise<GameApp> => {
  const game = new BabylonGame(canvas);
  await game.init();
  return game;
};

