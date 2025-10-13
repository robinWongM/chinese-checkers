import { Scene, Vector3 } from '@babylonjs/core';
import type { BoardPosition, GameConfig, HexPosition } from '../types';
import { Board } from '../world/Board';
import type { PointerHandlers } from './PointerTypes';

export class GameBoardSystem {
  private readonly board: Board;
  private readonly center = Vector3.Zero();
  private hexSize: number;

  constructor(scene: Scene, hexSize: number, config: GameConfig) {
    this.hexSize = hexSize;
    this.board = new Board(scene, this.center, this.hexSize, config);
  }

  getState(): Map<string, BoardPosition> {
    return this.board.getBoard();
  }

  getHexSize(): number {
    return this.hexSize;
  }

  getPositionAt(pos: HexPosition): BoardPosition | undefined {
    return this.board.getPositionAt(pos);
  }

  movePiece(from: HexPosition, to: HexPosition): void {
    this.board.movePiece(from, to);
  }

  resize(hexSize: number): void {
    this.hexSize = hexSize;
    this.board.resize(this.center, this.hexSize);
  }

  highlightSelected(pos: HexPosition): void {
    this.board.highlightSelected(pos);
  }

  highlightPositions(positions: HexPosition[]): void {
    this.board.highlightPositions(positions);
  }

  setPointerHandlers(handlers: PointerHandlers | null): void {
    this.board.setPointerHandlers(handlers);
  }

  clearHighlights(): void {
    this.board.clearHighlights();
  }

  refreshPieces(): void {
    this.board.refreshPieces();
  }

  dispose(): void {
    this.board.dispose();
  }
}
