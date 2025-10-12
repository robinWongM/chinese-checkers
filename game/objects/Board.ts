import {
  Animation,
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from '@babylonjs/core';
import type { HexPosition, BoardPosition, GameConfig } from '../types';
import { Player, PlayerInfo } from '../types';
import { HexUtils } from './Position';
import { THEME } from '../config/theme';

const toColor3 = (value: number): Color3 => {
  const clamped = Math.max(0, Math.min(0xffffff, value));
  const r = ((clamped >> 16) & 0xff) / 255;
  const g = ((clamped >> 8) & 0xff) / 255;
  const b = (clamped & 0xff) / 255;
  return new Color3(r, g, b);
};

interface HighlightMesh extends Mesh {
  metadata: {
    type: 'highlight' | 'selection';
    position: HexPosition;
  };
}

interface PieceMesh extends Mesh {
  metadata: {
    type: 'piece';
    position: HexPosition;
  };
}

export class Board {
  private readonly scene: Scene;
  private center: Vector3;
  private hexSize: number;
  private readonly elevation = 0.02;
  private board: Map<string, BoardPosition>;
  private readonly tileMeshes = new Map<string, Mesh>();
  private readonly pieceMeshes = new Map<string, PieceMesh>();
  private highlightMeshes: HighlightMesh[] = [];

  constructor(scene: Scene, center: Vector3, hexSize: number, config: GameConfig) {
    this.scene = scene;
    this.center = center.clone();
    this.hexSize = hexSize;
    this.board = HexUtils.createBoard(config);

    this.createTiles();
    this.createPieces();
  }

  public resize(center: Vector3, hexSize: number): void {
    this.center = center.clone();
    this.hexSize = hexSize;
    this.rebuild();
  }

  public getBoard(): Map<string, BoardPosition> {
    return this.board;
  }

  public getPieceAt(pos: HexPosition): PieceMesh | undefined {
    return this.pieceMeshes.get(HexUtils.toKey(pos));
  }

  public getPositionAt(pos: HexPosition): BoardPosition | undefined {
    return this.board.get(HexUtils.toKey(pos));
  }

  public getAllPieces(): PieceMesh[] {
    return Array.from(this.pieceMeshes.values());
  }

  public getWorldPosition(pos: HexPosition): Vector3 {
    const { x, y } = HexUtils.hexToPixel(pos, this.hexSize);
    return new Vector3(this.center.x + x, this.center.y, this.center.z + y);
  }

  public movePiece(from: HexPosition, to: HexPosition): void {
    const fromKey = HexUtils.toKey(from);
    const toKey = HexUtils.toKey(to);
    const mesh = this.pieceMeshes.get(fromKey);

    if (!mesh) {
      return;
    }

    const target = this.getWorldPosition(to).add(new Vector3(0, this.elevation + 0.1, 0));

    this.pieceMeshes.delete(fromKey);
    this.pieceMeshes.set(toKey, mesh);
    mesh.metadata.position = to;

    Animation.CreateAndStartAnimation(
      `piece-move-${Date.now()}`,
      mesh,
      'position',
      60,
      Math.max(1, Math.round((THEME.pieceMoveDuration / 1000) * 60)),
      mesh.position.clone(),
      target,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
      undefined,
      () => {
        const finalPos = this.getWorldPosition(to).add(new Vector3(0, this.elevation + 0.1, 0));
        mesh.position = finalPos;
      }
    );
  }

  public highlightPositions(
    positions: HexPosition[],
    options: { color?: number } = {}
  ): HighlightMesh[] {
    const color = toColor3(options.color ?? THEME.validMoveHighlightColor);
    const highlights = positions.map((pos) => {
      const mesh = MeshBuilder.CreateCylinder(
        `highlight-${HexUtils.toKey(pos)}`,
        { height: 0.01, diameter: this.hexSize * 1.4, tessellation: 32 },
        this.scene
      ) as HighlightMesh;
      mesh.position = this.getWorldPosition(pos).add(new Vector3(0, this.elevation + 0.02, 0));
      mesh.isPickable = true;
      mesh.renderingGroupId = 2;

      const material = new StandardMaterial(`highlight-mat-${HexUtils.toKey(pos)}`, this.scene);
      material.diffuseColor = color.clone();
      material.emissiveColor = color.clone();
      material.alpha = 0.35;
      material.specularColor = Color3.Black();
      mesh.material = material;

      mesh.metadata = { type: 'highlight', position: pos };
      this.highlightMeshes.push(mesh);
      return mesh;
    });
    return highlights;
  }

  public highlightSelected(pos: HexPosition): void {
    const mesh = MeshBuilder.CreateCylinder(
      `selection-${HexUtils.toKey(pos)}`,
      { height: 0.02, diameter: this.hexSize * 1.6, tessellation: 48 },
      this.scene
    ) as HighlightMesh;
    mesh.position = this.getWorldPosition(pos).add(new Vector3(0, this.elevation + 0.01, 0));
    mesh.isPickable = false;
    mesh.renderingGroupId = 1;

    const color = toColor3(THEME.selectedPieceHighlightColor);
    const material = new StandardMaterial(`selection-mat-${HexUtils.toKey(pos)}`, this.scene);
    material.diffuseColor = color.clone();
    material.emissiveColor = color.clone();
    material.alpha = 0.35;
    material.specularColor = Color3.Black();
    mesh.material = material;

    mesh.metadata = { type: 'selection', position: pos };
    this.highlightMeshes.push(mesh);
  }

  public clearHighlights(): void {
    this.highlightMeshes.forEach((mesh) => {
      mesh.material?.dispose();
      mesh.dispose();
    });
    this.highlightMeshes = [];
  }

  public refreshPieces(): void {
    this.pieceMeshes.forEach((mesh) => {
      mesh.material?.dispose();
      mesh.dispose();
    });
    this.pieceMeshes.clear();
    this.createPieces();
  }

  public dispose(): void {
    this.tileMeshes.forEach((mesh) => {
      mesh.material?.dispose();
      mesh.dispose();
    });
    this.pieceMeshes.forEach((mesh) => {
      mesh.material?.dispose();
      mesh.dispose();
    });
    this.highlightMeshes.forEach((mesh) => {
      mesh.material?.dispose();
      mesh.dispose();
    });
    this.tileMeshes.clear();
    this.pieceMeshes.clear();
    this.highlightMeshes = [];
  }

  private rebuild(): void {
    this.clearHighlights();
    this.tileMeshes.forEach((mesh) => {
      mesh.material?.dispose();
      mesh.dispose();
    });
    this.pieceMeshes.forEach((mesh) => {
      mesh.material?.dispose();
      mesh.dispose();
    });
    this.tileMeshes.clear();
    this.pieceMeshes.clear();
    this.createTiles();
    this.createPieces();
  }

  private createTiles(): void {
    this.board.forEach((pos, key) => {
      const mesh = MeshBuilder.CreateCylinder(
        `hex-${key}`,
        { height: 0.05, diameter: this.hexSize * 2, tessellation: 6 },
        this.scene
      );
      mesh.isPickable = false;
      mesh.renderingGroupId = 0;

      const color = this.resolveTileColor(pos);
      const material = new StandardMaterial(`hex-mat-${key}`, this.scene);
      material.diffuseColor = color.clone();
      material.specularColor = Color3.Black();
      material.emissiveColor = color.scale(0.2);

      mesh.material = material;
      mesh.position = this.getWorldPosition(pos).add(new Vector3(0, this.elevation - 0.03, 0));

      this.tileMeshes.set(key, mesh);
    });
  }

  private createPieces(): void {
    this.board.forEach((pos, key) => {
      if (pos.player === Player.NONE) {
        return;
      }

      const hexPos = HexUtils.fromKey(key);
      const mesh = MeshBuilder.CreateSphere(
        `piece-${key}`,
        { diameter: this.hexSize * THEME.pieceSizeRatio * 2 },
        this.scene
      ) as PieceMesh;
      mesh.position = this.getWorldPosition(pos).add(new Vector3(0, this.elevation + 0.1, 0));
      mesh.renderingGroupId = 3;
      mesh.isPickable = true;

      const color = toColor3(PlayerInfo.getColor(pos.player));
      const material = new StandardMaterial(`piece-mat-${key}`, this.scene);
      material.diffuseColor = color.clone();
      material.specularColor = Color3.Black();
      material.emissiveColor = color.scale(0.8);
      mesh.material = material;

      mesh.metadata = {
        type: 'piece',
        position: hexPos
      };

      this.pieceMeshes.set(key, mesh);
    });
  }

  private resolveTileColor(pos: BoardPosition): Color3 {
    if (typeof pos.corner === 'undefined' || pos.corner === Player.NONE) {
      return toColor3(THEME.defaultHexColor);
    }

    const color = PlayerInfo.getColor(pos.corner);
    return toColor3(color).scale(0.65);
  }
}
