<template>
  <div class="h-screen bg-slate-900 text-white">
    <ClientOnly>
      <div class="mx-auto flex h-screen w-full max-w-6xl flex-col px-4 pb-4 pt-6 md:px-6">
        <main class="relative flex h-screen w-full flex-1 items-stretch">
          <div
            id="game-container"
            class="relative w-full flex-1 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-xl"
          ></div>
          <div class="pointer-events-none absolute inset-0 flex flex-col">
            <header class="pointer-events-none flex flex-col items-center gap-4 p-4 text-center">
              <p
                class="text-lg font-semibold transition-colors duration-200"
                :class="playerTurnClass"
                aria-live="polite"
              >
                {{ currentPlayerLabel }}
              </p>

              <div class="flex min-h-[48px] flex-col items-center justify-center gap-2">
                <div
                  class="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-emerald-300 shadow-md transition-opacity duration-200"
                  :class="hasWinner ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                  role="status"
                  aria-live="polite"
                >
                  <p class="text-xl font-semibold transition-colors duration-200" :class="winnerClass">
                    {{ winnerLabel || '\u00A0' }}
                  </p>
                </div>

                <div class="h-5 flex items-center justify-center text-sm text-slate-300">
                  <span
                    class="inline-flex items-center gap-2 transition-opacity duration-200"
                    :class="isAIThinking ? 'opacity-100' : 'opacity-0'"
                  >
                    <span class="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400"></span>
                    AI is thinking…
                  </span>
                </div>

                <div
                  class="h-5 text-sm text-slate-300 transition-opacity duration-200"
                  :class="statusMessage ? 'opacity-100' : 'opacity-0'"
                >
                  {{ statusMessage || '\u00A0' }}
                </div>
              </div>
            </header>

            <div class="pointer-events-auto mt-auto flex justify-center pb-4">
              <nav class="flex flex-wrap justify-center gap-3 text-sm">
                <button
                  type="button"
                  class="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white transition hover:bg-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                  @click="handleRestart"
                >
                  Restart
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-indigo-500 px-4 py-2 font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                  @click="handleNewGame"
                >
                  New Game
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-slate-600 px-4 py-2 font-semibold text-white transition hover:bg-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  @click="backToMenu"
                >
                  Main Menu
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-white transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                  @click="handleExport"
                >
                  Export
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white transition hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  @click="handleImport"
                >
                  Import
                </button>
              </nav>
            </div>
          </div>
        </main>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { useRoute, useRouter, navigateTo } from '#app';
import type Phaser from 'phaser';
import { Player, PlayerInfo } from '@game/types';
import type { GameScene, GameUIHooks } from '@game/scenes/GameScene';

const route = useRoute()
const router = useRouter()

const currentPlayer = ref<Player | null>(null);
const winner = ref<Player | null>(null);
const isAIThinking = ref(false);
const statusMessage = ref('');
const sceneRef = shallowRef<GameScene | null>(null);
let gameConfigFromStorage: any = null;

let lastTouchEnd = 0;
let game: Phaser.Game | null = null;
let disposed = false;
let messageTimeout: ReturnType<typeof setTimeout> | null = null;
let GameSceneClass: typeof import('@game/scenes/GameScene').GameScene | null = null;

const getPlayerColorClass = (player: Player | null): string => {
  if (player === null) {
    return 'text-slate-200';
  }

  const color = PlayerInfo.getColor(player);
  switch (color) {
    case 0xEF4444:
      return 'text-red-400';
    case 0x10B981:
      return 'text-green-400';
    case 0xF59E0B:
      return 'text-orange-400';
    case 0x3B82F6:
      return 'text-blue-400';
    case 0x8B5CF6:
      return 'text-purple-400';
    case 0xEC4899:
      return 'text-pink-400';
    default:
      return 'text-slate-200';
  }
};

const currentPlayerLabel = computed(() =>
  currentPlayer.value !== null
    ? `${PlayerInfo.getName(currentPlayer.value)}'s Turn`
    : 'Preparing game…'
);

const playerTurnClass = computed(() => getPlayerColorClass(currentPlayer.value));

const winnerLabel = computed(() =>
  winner.value !== null ? `${PlayerInfo.getName(winner.value)} Wins!` : ''
);

const winnerClass = computed(() => getPlayerColorClass(winner.value));
const hasWinner = computed(() => winner.value !== null);

const setStatusMessage = (message: string) => {
  statusMessage.value = message;
  if (messageTimeout) {
    clearTimeout(messageTimeout);
  }

  if (message) {
    messageTimeout = setTimeout(() => {
      statusMessage.value = '';
      messageTimeout = null;
    }, 3000);
  }
};

const uiHooks: GameUIHooks = {
  updateTurn(player) {
    currentPlayer.value = player;
  },
  showWinMessage(winPlayer) {
    winner.value = winPlayer;
  },
  hideWinMessage() {
    winner.value = null;
  },
  setAIThinking(thinking) {
    isAIThinking.value = thinking;
  }
};

const preventTouchMove = (event: TouchEvent) => {
  event.preventDefault();
};

const handleTouchEnd = (event: TouchEvent) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
};

const bindScene = (scene: GameScene) => {
  if (disposed) {
    return;
  }

  sceneRef.value = scene;
  const snapshot = scene.getStateSnapshot();
  currentPlayer.value = snapshot.currentPlayer;
  winner.value = snapshot.winner ?? null;
};

const handleRestart = () => {
  sceneRef.value?.restartGame();
  setStatusMessage('Game restarted.');
};

const handleNewGame = () => {
  // Clear current game config and redirect to menu
  sessionStorage.removeItem('gameConfig');
  if (game) {
    game.destroy(true);
    game = null;
  }
  sceneRef.value = null;
  navigateTo('/menu');
};

const backToMenu = () => {
  // Clear current game config and redirect to menu
  sessionStorage.removeItem('gameConfig');
  if (game) {
    game.destroy(true);
    game = null;
  }
  sceneRef.value = null;
  navigateTo('/menu');
};

const handleExport = async () => {
  const scene = sceneRef.value;
  if (!scene) {
    return;
  }

  const serialized = scene.getSerializedState();
  try {
    await navigator.clipboard.writeText(serialized);
    setStatusMessage('Board state copied to clipboard.');
  } catch (error) {
    console.error('Failed to copy board state', error);
    window.prompt('Copy board state JSON', serialized);
    setStatusMessage('Copy failed. JSON ready to copy manually.');
  }
};

const applyImportedState = (scene: GameScene, data: string) => {
  const success = scene.applySerializedState(data);
  setStatusMessage(success ? 'Board state imported.' : 'Import failed. Check JSON and try again.');
  if (!success) {
    console.warn('Invalid board state JSON', data);
  }
};

const handleImport = async () => {
  const scene = sceneRef.value;
  if (!scene) {
    return;
  }

  let data: string | null = null;
  try {
    data = await navigator.clipboard.readText();
  } catch (error) {
    console.error('Failed to read clipboard', error);
  }

  if (!data) {
    data = window.prompt('Paste the board state JSON');
  }

  if (!data) {
    setStatusMessage('Import cancelled.');
    return;
  }

  applyImportedState(scene, data);
};

onMounted(async () => {
  disposed = false;
  
  // Get configuration from sessionStorage
  const configData = sessionStorage.getItem('gameConfig');
  if (!configData) {
    // Redirect to menu if no config found
    router.push('/menu');
    return;
  }
  
  gameConfigFromStorage = JSON.parse(configData);
  console.log('Starting game with config:', gameConfigFromStorage);

  document.addEventListener('touchmove', preventTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd, { passive: false });

  const [{ default: Phaser }, { gameConfig }, gameSceneModule] = await Promise.all([
    import('phaser'),
    import('@game/config'),
    import('@game/scenes/GameScene')
  ]);

  // Apply configuration to game config
  if (gameConfigFromStorage) {
    console.log('Applying game configuration:', gameConfigFromStorage);
    // TODO: Apply configuration to game config based on selections
  }

  GameSceneClass = gameSceneModule.GameScene;
  GameSceneClass.registerUIHooks(uiHooks);
  GameSceneClass.onReady(bindScene);

  game = new Phaser.Game(gameConfig);
  console.info('Chinese Checkers game initialized via Nuxt!');
  (window as any).game = game;
});

onBeforeUnmount(() => {
  disposed = true;
  document.removeEventListener('touchmove', preventTouchMove);
  document.removeEventListener('touchend', handleTouchEnd);

  if (messageTimeout) {
    clearTimeout(messageTimeout);
    messageTimeout = null;
  }

  GameSceneClass?.registerUIHooks(null);
  sceneRef.value = null;

  if (game) {
    game.destroy(true);
    game = null;
  }
});
</script>
