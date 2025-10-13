import {
  ArcRotateCamera,
  Color3,
  HemisphericLight,
  Scene,
  Vector3
} from '@babylonjs/core';

const CAMERA_ALPHA = (Math.PI / 6) * 4;
const CAMERA_BETA = 0;
const CAMERA_RADIUS = Math.PI / 3;
const CAMERA_MIN_RADIUS = 18;
const CAMERA_MAX_RADIUS = 60;
const RADIUS_FACTOR = 32;

export class GameCameraRig {
  private readonly camera: ArcRotateCamera;
  private readonly light: HemisphericLight;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.camera = new ArcRotateCamera(
      'game-camera',
      CAMERA_ALPHA,
      CAMERA_BETA,
      CAMERA_RADIUS,
      Vector3.Zero(),
      scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.allowUpsideDown = false;
    this.camera.useAutoRotationBehavior = false;
    this.camera.inputs.clear();
    this.camera.lowerRadiusLimit = CAMERA_MIN_RADIUS;
    this.camera.upperRadiusLimit = CAMERA_MAX_RADIUS;

    this.light = new HemisphericLight('game-light', new Vector3(0, 1, 0), scene);
    this.light.diffuse = new Color3(1, 1, 1);
    this.light.groundColor = new Color3(0.1, 0.12, 0.16);
    this.light.specular = new Color3(0.5, 0.5, 0.5);
    this.light.intensity = 0.95;
  }

  updateForHexSize(hexSize: number): void {
    this.camera.radius = Math.max(hexSize * RADIUS_FACTOR, CAMERA_MIN_RADIUS);
  }

  dispose(): void {
    this.camera.detachControl();
    this.light.dispose();
    this.camera.dispose();
  }
}
