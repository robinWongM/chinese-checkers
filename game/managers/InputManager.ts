import Phaser from 'phaser';
import type { HexPosition } from '../types';

/**
 * Manages all user input for the game, including pointer events and coordinate transformations.
 * It emits high-level events that the GameScene can listen to.
 */
export class InputManager extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private cameraAngle: number;

  constructor(scene: Phaser.Scene, cameraAngle: number) {
    super();
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.cameraAngle = cameraAngle;

    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    // As the camera is rotated, we need to transform the click coordinates 
    // back to the board's coordinate system.
    const { width, height } = this.camera;
    const centerX = width / 2;
    const centerY = height / 2;
    
    const relX = pointer.x - centerX;
    const relY = pointer.y - centerY;
    
    // Reverse the rotation
    const rotation = -Phaser.Math.DegToRad(this.cameraAngle);
    const rotatedX = relX * Math.cos(rotation) - relY * Math.sin(rotation) + centerX;
    const rotatedY = relX * Math.sin(rotation) + relY * Math.cos(rotation) + centerY;
    
    this.emit('pointerdown_transformed', { x: rotatedX, y: rotatedY });
  }

  public override destroy(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.removeAllListeners();
  }
}
