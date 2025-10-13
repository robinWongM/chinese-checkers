import {
  PointerEventTypes,
  type PointerInfo,
  type Nullable,
  type Observer,
  Scene
} from '@babylonjs/core';
import type { GameBoardSystem } from './GameBoardSystem';
import type { PointerHandlers } from './PointerTypes';

export class PointerInputSystem {
  private readonly scene: Scene;
  private readonly board: GameBoardSystem;
  private readonly observer: Nullable<Observer<PointerInfo>>;

  constructor(scene: Scene, board: GameBoardSystem, handlers: PointerHandlers) {
    this.scene = scene;
    this.board = board;
    this.board.setPointerHandlers({
      onPiece: handlers.onPiece,
      onHighlight: handlers.onHighlight,
      onEmpty: handlers.onEmpty
    });

    this.observer = scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type !== PointerEventTypes.POINTERDOWN) {
        return;
      }
      const pickInfo = pointerInfo.pickInfo;
      if (!pickInfo?.hit) {
        handlers.onEmpty();
        return;
      }
      const metadata = pickInfo.pickedMesh?.metadata as { type?: string } | undefined;
      if (metadata?.type === 'piece' || metadata?.type === 'highlight') {
        return;
      }
      handlers.onEmpty();
    });
  }

  dispose(): void {
    this.board.setPointerHandlers(null);
    if (this.observer) {
      this.scene.onPointerObservable.remove(this.observer);
    }
  }
}
