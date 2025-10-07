import Phaser from 'phaser';
import type { HexPosition, BoardPosition } from '../types';
import { Player } from '../types';
import { HexUtils } from './Position';
import { THEME } from '../config/theme';

export class Board {
  private scene: Phaser.Scene;
  private hexSize: number;
  private board: Map<string, BoardPosition>;
  private graphics: Phaser.GameObjects.Graphics;
  private pieceSprites: Map<string, Phaser.GameObjects.Arc>;
  private highlightSprites: Phaser.GameObjects.Arc[] = [];
  private centerX: number;
  private centerY: number;

  constructor(scene: Phaser.Scene, centerX: number, centerY: number, hexSize: number) {
    this.scene = scene;
    this.centerX = centerX;
    this.centerY = centerY;
    this.hexSize = hexSize;
    this.board = HexUtils.createBoard();
    this.graphics = scene.add.graphics();
    this.pieceSprites = new Map();

    this.render();
  }

  private render(): void {
    this.graphics.clear();
    
    this.board.forEach((pos) => {
      const pixel = this.getPixelPosition(pos);
      
      // Color-code different zones for visibility
      let fillColor = THEME.defaultHexColor;
      if (pos.isStartZone1 && pos.player === Player.PLAYER1) {
        fillColor = THEME.player1StartColor;
      } else if (pos.isStartZone2 && pos.player === Player.PLAYER2) {
        fillColor = THEME.player2StartColor;
      } else if (pos.isGoalZone1 && pos.player === Player.NONE) {
        fillColor = THEME.player1GoalColor;
      } else if (pos.isGoalZone2 && pos.player === Player.NONE) {
        fillColor = THEME.player2GoalColor;
      } else if (pos.isCornerNE) {
        fillColor = THEME.cornerNEColor;
      } else if (pos.isCornerSE) {
        fillColor = THEME.cornerSEColor;
      } else if (pos.isCornerSW) {
        fillColor = THEME.cornerSWColor;
      } else if (pos.isCornerNW) {
        fillColor = THEME.cornerNWColor;
      }
      
      this.drawHexagon(pixel.x, pixel.y, this.hexSize, fillColor, THEME.hexStrokeColor);
    });

    this.renderPieces();
  }

  private drawHexagon(x: number, y: number, size: number, fillColor: number, strokeColor: number): void {
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      points.push(new Phaser.Geom.Point(
        x + size * Math.cos(angle),
        y + size * Math.sin(angle)
      ));
    }

    this.graphics.fillStyle(fillColor, 0.3);
    this.graphics.lineStyle(2, strokeColor, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < 6; i++) {
      this.graphics.lineTo(points[i].x, points[i].y);
    }
    this.graphics.closePath();
    this.graphics.strokePath();
    this.graphics.fillPath();
  }

  private renderPieces(): void {
    this.pieceSprites.forEach(sprite => sprite.destroy());
    this.pieceSprites.clear();

    this.board.forEach((pos, key) => {
      if (pos.player !== Player.NONE) {
        const pixel = this.getPixelPosition(pos);
        const color = pos.player === Player.PLAYER1 ? THEME.player1Color : THEME.player2Color;
        
        const piece = this.scene.add.circle(pixel.x, pixel.y, this.hexSize * THEME.pieceSizeRatio, color);
        piece.setStrokeStyle(3, THEME.pieceStrokeColor, 0.8);
        piece.setDepth(100); // 棋子在中层
        piece.setInteractive({ useHandCursor: true });
        piece.setData('position', pos);
        
        this.pieceSprites.set(key, piece);
      }
    });
  }

  public getPixelPosition(pos: HexPosition): { x: number; y: number } {
    const hex = HexUtils.hexToPixel(pos, this.hexSize);
    return {
      x: this.centerX + hex.x,
      y: this.centerY + hex.y
    };
  }

  public getPieceAt(pos: HexPosition): Phaser.GameObjects.Arc | undefined {
    return this.pieceSprites.get(HexUtils.toKey(pos));
  }

  public getPositionAt(pos: HexPosition): BoardPosition | undefined {
    return this.board.get(HexUtils.toKey(pos));
  }

  public movePiece(from: HexPosition, to: HexPosition): void {
    const fromKey = HexUtils.toKey(from);
    const toKey = HexUtils.toKey(to);

    const piece = this.pieceSprites.get(fromKey);
    
    if (piece) {
      const toPixel = this.getPixelPosition(to);
      
      this.scene.tweens.add({
        targets: piece,
        x: toPixel.x,
        y: toPixel.y,
        duration: THEME.pieceMoveDuration,
        ease: 'Power2',
        onComplete: () => {
          this.pieceSprites.delete(fromKey);
          this.pieceSprites.set(toKey, piece);
          piece.setData('position', to);
        }
      });
    }
  }

  public highlightPositions(positions: HexPosition[], onClickCallback?: (pos: HexPosition) => void): void {
    positions.forEach((pos) => {
      const pixel = this.getPixelPosition(pos);
      const highlight = this.scene.add.circle(pixel.x, pixel.y, this.hexSize * THEME.validMoveSizeRatio, THEME.validMoveHighlightColor, 0.4);
      highlight.setStrokeStyle(3, THEME.validMoveHighlightColor, 0.8);
      highlight.setDepth(1000);
      highlight.setInteractive({ useHandCursor: true });
      highlight.setData('position', pos);
      highlight.setData('isValidMove', true);
      
      if (onClickCallback) {
        highlight.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          pointer.event.stopPropagation();
          onClickCallback(pos);
        });
      }
      
      this.highlightSprites.push(highlight);
    });
  }

  public clearHighlights(): void {
    this.highlightSprites.forEach(sprite => sprite.destroy());
    this.highlightSprites = [];
  }

  public highlightSelected(pos: HexPosition): void {
    const pixel = this.getPixelPosition(pos);
    const highlight = this.scene.add.circle(pixel.x, pixel.y, this.hexSize * THEME.selectedHighlightSizeRatio, THEME.selectedPieceHighlightColor, 0.3);
    highlight.setStrokeStyle(4, THEME.selectedPieceHighlightColor, 1);
    highlight.setDepth(50); // 选中高亮在棋子下方
    this.highlightSprites.push(highlight);
  }

  public getBoard(): Map<string, BoardPosition> {
    return this.board;
  }

  public getAllPieces(): Phaser.GameObjects.Arc[] {
    return Array.from(this.pieceSprites.values());
  }

  public findPositionByPixel(x: number, y: number): HexPosition | null {
    let closestPos: HexPosition | null = null;
    let minDist = Infinity;

    this.board.forEach((pos) => {
      const pixel = this.getPixelPosition(pos);
      const dist = Phaser.Math.Distance.Between(x, y, pixel.x, pixel.y);
      
      if (dist < this.hexSize && dist < minDist) {
        minDist = dist;
        closestPos = pos;
      }
    });

    return closestPos;
  }

  public renderBoard(newBoard: Map<string, BoardPosition>): void {
    // 更新内部棋盘状态
    this.board = newBoard;
    
    // 重新渲染整个棋盘
    this.render();
  }
}
