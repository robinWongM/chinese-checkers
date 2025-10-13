import {
  ActionManager,
  Animation,
  Color3,
  ExecuteCodeAction,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from '@babylonjs/core';
import type { HexPosition, BoardPosition, GameConfig } from '../types';
import { Player, PlayerInfo } from '../types';
import { HexUtils } from '../logic/HexUtils';
import { THEME } from '../config/theme';
import type { PointerHandlers } from '../systems/PointerTypes';

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
    baseDiameter: number;
    baseHeight: number;
  };
}

interface PieceMesh extends Mesh {
  metadata: {
    type: 'piece';
    position: HexPosition;
  };
}

interface HighlightOptions {
  diameter: number;
  height: number;
  heightOffset: number;
  color: Color3;
  alpha: number;
  isPickable: boolean;
  renderGroupId: number;
  tessellation: number;
}

export class Board {
  private readonly scene: Scene;
  private center: Vector3;
  private hexSize: number;
  private readonly elevation = 0.02;
  private board: Map<string, BoardPosition>;
  private readonly tileMeshes = new Map<string, Mesh>();
  private readonly pieceMeshes = new Map<string, PieceMesh>();
  private activeHighlights: HighlightMesh[] = [];
  private readonly highlightPool: HighlightMesh[] = [];
  private selectionHighlight: HighlightMesh | null = null;
  private highlightCounter = 0;
  private pointerHandlers: PointerHandlers | null = null;

  constructor(scene: Scene, center: Vector3, hexSize: number, config: GameConfig) {
    this.scene = scene;
    this.center = center.clone();
    this.hexSize = hexSize;
    this.board = HexUtils.createBoard(config);

    this.createTiles();
    this.createPieces();
  }

  public setPointerHandlers(handlers: PointerHandlers | null): void {
    this.pointerHandlers = handlers;
    this.applyPointerHandlersToPieces();
    this.applyPointerHandlersToHighlights();
  }

  public resize(center: Vector3, hexSize: number): void {
    const previousSize = this.hexSize;
    this.center = center.clone();
    if (previousSize === hexSize) {
      return;
    }

    const ratio = previousSize > 0 ? hexSize / previousSize : 1;
    this.hexSize = hexSize;

    this.tileMeshes.forEach((mesh, key) => {
      mesh.scaling.x *= ratio;
      mesh.scaling.y *= ratio;
      mesh.scaling.z *= ratio;
      const boardPos = this.board.get(key);
      if (boardPos) {
        mesh.position = this.getWorldPosition(boardPos).add(new Vector3(0, this.elevation - 0.03, 0));
      }
    });

    this.pieceMeshes.forEach((mesh) => {
      mesh.scaling.x *= ratio;
      mesh.scaling.y *= ratio;
      mesh.scaling.z *= ratio;
      mesh.position = this.getWorldPosition(mesh.metadata.position).add(
        new Vector3(0, this.elevation + 0.1, 0)
      );
    });

    if (this.selectionHighlight) {
      this.applyHighlightTransform(
        this.selectionHighlight,
        this.selectionHighlight.metadata.position,
        this.hexSize * 1.6,
        0.02,
        this.elevation + 0.01
      );
    }
    this.activeHighlights.forEach((mesh) => {
      this.applyHighlightTransform(
        mesh,
        mesh.metadata.position,
        this.hexSize * 1.4,
        0.01,
        this.elevation + 0.02
      );
    });
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
    this.releaseActiveHighlights();
    const color = toColor3(options.color ?? THEME.validMoveHighlightColor);
    const highlights = positions.map((pos) =>
      this.acquireHighlightMesh('highlight', pos, {
        diameter: this.hexSize * 1.4,
        height: 0.01,
        heightOffset: this.elevation + 0.02,
        color,
        alpha: 0.35,
        isPickable: true,
        renderGroupId: 2,
        tessellation: 32
      })
    );
    this.activeHighlights = highlights;
    return highlights;
  }

  public highlightSelected(pos: HexPosition): void {
    if (this.selectionHighlight) {
      this.releaseHighlight(this.selectionHighlight);
      this.selectionHighlight = null;
    }
    const color = toColor3(THEME.selectedPieceHighlightColor);
    const mesh = this.acquireHighlightMesh('selection', pos, {
      diameter: this.hexSize * 1.6,
      height: 0.02,
      heightOffset: this.elevation + 0.01,
      color,
      alpha: 0.35,
      isPickable: false,
      renderGroupId: 1,
      tessellation: 48
    });
    this.selectionHighlight = mesh;
  }

  public clearHighlights(): void {
    this.releaseActiveHighlights();
    if (this.selectionHighlight) {
      this.releaseHighlight(this.selectionHighlight);
      this.selectionHighlight = null;
    }
  }

  public refreshPieces(): void {
    this.pieceMeshes.forEach((mesh) => {
      mesh.material?.dispose();
      mesh.dispose();
    });
    this.pieceMeshes.clear();
    this.createPieces();
  }

  private applyPointerHandlersToPieces(): void {
    this.pieceMeshes.forEach((mesh) => {
      this.applyPointerHandlersToPiece(mesh);
    });
  }

  private applyPointerHandlersToHighlights(): void {
    this.activeHighlights.forEach((mesh) => this.applyPointerHandlersToHighlight(mesh));
    this.highlightPool.forEach((mesh) => this.applyPointerHandlersToHighlight(mesh));
    if (this.selectionHighlight) {
      this.applyPointerHandlersToHighlight(this.selectionHighlight);
    }
  }

  private acquireHighlightMesh(
    type: 'highlight' | 'selection',
    pos: HexPosition,
    options: HighlightOptions
  ): HighlightMesh {
    const mesh =
      this.highlightPool.pop() ??
      this.createHighlightMesh(options.diameter, options.height, options.tessellation);

    mesh.metadata.type = type;
    mesh.metadata.position = pos;
    this.applyHighlightTransform(mesh, pos, options.diameter, options.height, options.heightOffset);
    this.applyHighlightMaterial(mesh, options.color, options.alpha);
    mesh.isPickable = options.isPickable;
    mesh.renderingGroupId = options.renderGroupId;
    mesh.setEnabled(true);
    mesh.isVisible = true;

    this.applyPointerHandlersToHighlight(mesh);
    return mesh;
  }

  private applyHighlightTransform(
    mesh: HighlightMesh,
    pos: HexPosition,
    diameter: number,
    height: number,
    heightOffset: number
  ): void {
    const scaleRatio = diameter / mesh.metadata.baseDiameter;
    mesh.scaling.x = scaleRatio;
    mesh.scaling.z = scaleRatio;
    mesh.scaling.y = height / mesh.metadata.baseHeight;
    mesh.position = this.getWorldPosition(pos).add(new Vector3(0, heightOffset, 0));
  }

  private applyHighlightMaterial(mesh: HighlightMesh, color: Color3, alpha: number): void {
    let material = mesh.material as StandardMaterial | null;
    if (!material) {
      material = new StandardMaterial(`highlight-mat-${mesh.name}`, this.scene);
      material.specularColor = Color3.Black();
      mesh.material = material;
    }
    material.diffuseColor = color.clone();
    material.emissiveColor = color.clone();
    material.alpha = alpha;
  }

  private releaseActiveHighlights(): void {
    this.activeHighlights.forEach((mesh) => this.releaseHighlight(mesh));
    this.activeHighlights = [];
  }

  private releaseHighlight(mesh: HighlightMesh): void {
    mesh.setEnabled(false);
    mesh.isVisible = false;
    if (!this.highlightPool.includes(mesh)) {
      this.highlightPool.push(mesh);
    }
  }

  private disposeHighlight(mesh: HighlightMesh): void {
    mesh.material?.dispose();
    mesh.dispose();
  }

  private createHighlightMesh(
    diameter: number,
    height: number,
    tessellation: number
  ): HighlightMesh {
    const mesh = MeshBuilder.CreateCylinder(
      `highlight-${this.highlightCounter++}`,
      { height, diameter, tessellation },
      this.scene
    ) as HighlightMesh;
    mesh.metadata = {
      type: 'highlight',
      position: { q: 0, r: 0, s: 0 },
      baseDiameter: diameter,
      baseHeight: height
    };
    mesh.isPickable = false;
    mesh.setEnabled(false);
    mesh.isVisible = false;
    return mesh;
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
    this.activeHighlights.forEach((mesh) => this.disposeHighlight(mesh));
    this.activeHighlights = [];
    if (this.selectionHighlight) {
      this.disposeHighlight(this.selectionHighlight);
      this.selectionHighlight = null;
    }
    this.highlightPool.forEach((mesh) => this.disposeHighlight(mesh));
    this.highlightPool.length = 0;
    this.tileMeshes.clear();
    this.pieceMeshes.clear();
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
      this.applyPointerHandlersToPiece(mesh);
    });
  }

  private resolveTileColor(pos: BoardPosition): Color3 {
    if (typeof pos.corner === 'undefined' || pos.corner === Player.NONE) {
      return toColor3(THEME.defaultHexColor);
    }

    const color = PlayerInfo.getColor(pos.corner);
    return toColor3(color).scale(0.65);
  }

  private applyPointerHandlersToPiece(mesh: PieceMesh): void {
    mesh.isPickable = true;
    this.resetActionManager(mesh);
    if (!this.pointerHandlers) {
      return;
    }
    mesh.actionManager = new ActionManager(this.scene);
    mesh.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        this.pointerHandlers?.onPiece(mesh.metadata.position);
      })
    );
  }

  private applyPointerHandlersToHighlight(mesh: HighlightMesh): void {
    mesh.isPickable = mesh.metadata.type === 'highlight';
    this.resetActionManager(mesh);
    if (!this.pointerHandlers || mesh.metadata.type !== 'highlight') {
      return;
    }
    mesh.actionManager = new ActionManager(this.scene);
    mesh.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        this.pointerHandlers?.onHighlight(mesh.metadata.position);
      })
    );
  }

  private resetActionManager(mesh: Mesh): void {
    if (mesh.actionManager) {
      mesh.actionManager.dispose();
      mesh.actionManager = null;
    }
  }
}
