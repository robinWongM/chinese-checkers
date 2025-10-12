<template>
  <div class="h-screen w-screen bg-slate-900">
    <canvas
      id="game-canvas"
      ref="canvasRef"
      class="h-full w-full"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let game: Awaited<ReturnType<typeof import('@game/config').createGameApp>> | null = null;

onMounted(async () => {
  const canvas = canvasRef.value;
  if (!canvas) {
    return;
  }
  const { createGameApp } = await import('@game/config');
  game = await createGameApp(canvas);
});

onBeforeUnmount(() => {
  if (game) {
    game.dispose();
    game = null;
  }
});
</script>
