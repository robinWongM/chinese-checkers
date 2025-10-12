<template>
  <div class="h-full bg-slate-900 text-white">
    <div class="h-full flex flex-col">
      <header class="flex items-center justify-between p-4 border-b border-slate-700">
        <button
          @click="goToMenu"
          class="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 class="text-xl font-semibold">{{ modeName }} Setup</h2>
        <div class="w-10"></div>
      </header>

      <div class="flex-1 overflow-y-auto p-6">
        <!-- Player Count Selection -->
        <div v-if="currentMode === 'multiplayer'" class="mb-8">
          <label class="block text-sm font-medium mb-3 text-slate-300">Number of Players</label>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="count in [2, 3, 4, 6]"
              :key="count"
              @click="playerCount = count"
              :class="[
                'py-3 px-4 rounded-lg font-medium transition-all',
                playerCount === count 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              ]"
            >
              {{ count }}
            </button>
          </div>
        </div>

        <!-- AI Difficulty -->
        <div v-if="showAIDifficulty" class="mb-8">
          <label class="block text-sm font-medium mb-3 text-slate-300">AI Difficulty</label>
          <div class="space-y-3">
            <button
              v-for="difficulty in ['easy', 'medium', 'hard'] as const"
              :key="difficulty"
              @click="aiDifficulty = difficulty"
              :class="[
                'w-full py-3 px-4 rounded-lg font-medium text-left transition-all',
                aiDifficulty === difficulty 
                  ? 'bg-green-500 text-white shadow-lg' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              ]"
            >
              <span class="capitalize">{{ difficulty }}</span>
              <span class="block text-sm opacity-75">{{ getDifficultyDescription(difficulty) }}</span>
            </button>
          </div>
        </div>

        <!-- Player Configuration for Multiplayer -->
        <div v-if="currentMode === 'multiplayer'" class="mb-8">
          <label class="block text-sm font-medium mb-3 text-slate-300">Player Configuration</label>
          <div class="space-y-3">
            <div 
              v-for="(player, index) in playerConfig" 
              :key="index"
              class="flex items-center justify-between p-3 rounded-lg bg-slate-700"
            >
              <div class="flex items-center space-x-3">
                <div 
                  class="w-4 h-4 rounded-full"
                  :style="{ backgroundColor: getPlayerColor(player) }"
                ></div>
                <span class="text-slate-200">{{ getPlayerName(player) }}</span>
              </div>
              <button
                @click="togglePlayerType(index)"
                :class="[
                  'px-3 py-1 rounded-full text-sm font-medium',
                  playerTypes[index] === 'ai' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-blue-500 text-white'
                ]"
              >
                {{ playerTypes[index]?.toUpperCase() }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Start Game Button -->
      <div class="p-6 border-t border-slate-700">
        <button
          @click="startGame"
          class="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95"
        >
          Start Game
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, navigateTo } from '#app'
import { Player, PlayerInfo, type GameConfig, type PlayerConfig } from '@game/types'

const route = useRoute()

const playerCount = ref(2)
const aiDifficulty = ref<'easy' | 'medium' | 'hard'>('medium')
const playerTypes = ref<('human' | 'ai')[]>(['human', 'ai'])

const currentMode = computed(() => {
  const mode = Array.isArray(route.params.mode) ? route.params.mode[0] : route.params.mode
  return (mode as string) ?? 'multiplayer'
})

const modeName = computed(() => {
  switch (currentMode.value) {
    case 'ai': return 'Play vs AI'
    case 'multiplayer': return 'Local Multiplayer'
    default: return 'Game'
  }
})

const showAIDifficulty = computed(() => 
  currentMode.value === 'ai' || 
  (currentMode.value === 'multiplayer' && playerTypes.value.some((type: 'human' | 'ai') => type === 'ai'))
)

const playerConfig = computed(() => {
  const players: Player[] = []
  if (playerCount.value === 2) {
    players.push(Player.SOUTH, Player.NORTH)
  } else if (playerCount.value === 3) {
    players.push(Player.NORTH, Player.SOUTH_EAST, Player.SOUTH_WEST)
  } else if (playerCount.value === 4) {
    players.push(Player.NORTH, Player.SOUTH_EAST, Player.SOUTH, Player.NORTH_WEST)
  } else if (playerCount.value === 6) {
    players.push(Player.NORTH, Player.NORTH_EAST, Player.SOUTH_EAST, Player.SOUTH, Player.SOUTH_WEST, Player.NORTH_WEST)
  }
  return players
})

// Initialize defaults based on mode
watch(currentMode, (mode) => {
  if (mode === 'ai') {
    playerCount.value = 2
    playerTypes.value = ['human', 'ai']
  } else if (mode === 'multiplayer') {
    playerTypes.value = Array(playerCount.value).fill('human')
  }
}, { immediate: true })

// Update player types when player count changes
watch(playerCount, (newCount: number) => {
  if (currentMode.value === 'multiplayer') {
    playerTypes.value = Array(newCount).fill('human')
  }
})

function togglePlayerType(index: number) {
  const currentType = playerTypes.value[index]
  if (currentType === 'human') {
    playerTypes.value[index] = 'ai'
  } else {
    playerTypes.value[index] = 'human'
  }
}

function goToMenu() {
  navigateTo('/menu')
}

function startGame() {
  const mode = currentMode.value
  const activePlayers = mode === 'ai'
    ? [Player.SOUTH, Player.NORTH]
    : playerConfig.value.slice(0, playerCount.value)

  const resolvedPlayerTypes = activePlayers.map((_, index) => {
    if (mode === 'ai') {
      return index === 0 ? 'human' : 'ai'
    }
    return playerTypes.value[index] ?? 'human'
  })

  const playerConfigs: PlayerConfig[] = activePlayers.map((player, index) => {
    const isAI = resolvedPlayerTypes[index] === 'ai'
    return {
      player,
      isAI,
      ...(isAI ? { aiType: 'greedy', aiDifficulty: aiDifficulty.value } : {})
    }
  })

  const gameConfig: GameConfig = {
    playerCount: activePlayers.length,
    activePlayers,
    playerConfigs
  }

  const config = {
    mode,
    playerCount: activePlayers.length,
    aiDifficulty: aiDifficulty.value,
    playerTypes: resolvedPlayerTypes,
    gameConfig
  }

  // Store config in sessionStorage for the game page to access
  sessionStorage.setItem('gameConfig', JSON.stringify(config))
  
  // Navigate to game page
  navigateTo('/game')
}

function getPlayerColor(player: Player): string {
  const color = PlayerInfo.getColor(player)
  return `#${color.toString(16).padStart(6, '0')}`
}

function getPlayerName(player: Player): string {
  return PlayerInfo.getName(player)
}

function getDifficultyDescription(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return 'Perfect for beginners'
    case 'medium': return 'A decent challenge'
    case 'hard': return 'For experienced players'
    default: return ''
  }
}
</script>
