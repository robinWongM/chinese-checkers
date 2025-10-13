import type { HexPosition } from '../types';

export interface PointerHandlers {
  onPiece(position: HexPosition): void;
  onHighlight(position: HexPosition): void;
  onEmpty(): void;
}
