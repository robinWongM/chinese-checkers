import Phaser from 'phaser';
import type { HexPosition, BoardPosition, GameConfig } from '../types';
import { Player, PlayerInfo } from '../types';
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

  constructor(scene: Phaser.Scene, centerX: number, centerY: number, hexSize: number, config: GameConfig) {
    this.scene = scene;
    this.centerX = centerX;
    this.centerY = centerY;
    this.hexSize = hexSize;
    this.board = HexUtils.createBoard(config);
    this.graphics = scene.add.graphics();
    this.pieceSprites = new Map();

    this.render();
  }

  private render(): void {
    this.graphics.clear();
    
    this.board.forEach((pos) => {
      const pixel = this.getPixelPosition(pos);
      
      // Color-code corner zones
      let fillColor = THEME.defaultHexColor;
      if (typeof pos.corner !== 'undefined' && pos.corner !== Player.NONE) {
        // Slightly highlight the corner
        const cornerColor = PlayerInfo.getColor(pos.corner);
        fillColor = cornerColor;
        // If a player occupies this corner, make it darker/lighter
        if (pos.player === pos.corner) {
          // Occupied by owner - make it brighter (reduce opacity will be set later)
        }
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
    this.graphics.lineStyle(4, strokeColor, 1);
    this.graphics.beginPath();
    const firstPoint = points[0];
    if (!firstPoint) {
      return;
    }
    this.graphics.moveTo(firstPoint.x, firstPoint.y);
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      if (!point) {
        continue;
      }
      this.graphics.lineTo(point.x, point.y);
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
        const color = PlayerInfo.getColor(pos.player);
        
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

  public resize(centerX: number, centerY: number, hexSize: number): void {
    this.centerX = centerX;
    this.centerY = centerY;
    this.hexSize = hexSize;
    this.clearHighlights();
    this.render();
  }
}
