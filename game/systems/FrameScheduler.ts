import type { Observer, Scene } from '@babylonjs/core';

interface ScheduledTask {
  remaining: number;
  action: () => void;
}

/**
 * Minimal scheduler that runs callbacks off Babylon's render loop.
 * Keeps gameplay timing tied to the engine rather than `setTimeout`.
 */
export class FrameScheduler {
  private readonly tasks = new Set<ScheduledTask>();
  private readonly scene: Scene;
  private readonly observer: Observer<Scene>;

  constructor(scene: Scene) {
    this.scene = scene;
    this.observer = scene.onBeforeRenderObservable.add(() => {
      const delta = scene.getEngine().getDeltaTime();
      this.flush(delta);
    });
  }

  schedule(delayMs: number, action: () => void): () => void {
    const task: ScheduledTask = { remaining: delayMs, action };
    this.tasks.add(task);
    return () => {
      this.tasks.delete(task);
    };
  }

  dispose(): void {
    this.scene.onBeforeRenderObservable.remove(this.observer);
    this.tasks.clear();
  }

  private flush(delta: number): void {
    const finished: ScheduledTask[] = [];

    this.tasks.forEach((task) => {
      task.remaining -= delta;
      if (task.remaining <= 0) {
        finished.push(task);
      }
    });

    finished.forEach((task) => {
      this.tasks.delete(task);
      task.action();
    });
  }
}
