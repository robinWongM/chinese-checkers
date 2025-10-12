<template>
  <div class="h-full bg-slate-900 text-white">
    <div class="h-full flex flex-col items-center justify-center px-6">
      <div class="text-center mb-12">
        <h1 class="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Chinese Checkers
        </h1>
        <p class="text-slate-300 text-lg">Strategic board game for 2-6 players</p>
      </div>

      <div class="w-full max-w-xs space-y-4">
        <button
          v-for="mode in gameModes"
          :key="mode.id"
          @click="navigateToSetup(mode.id)"
          class="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95"
        >
          {{ mode.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from '#app'

const gameModes = [
  { id: 'ai', name: 'Play vs AI', description: 'Challenge the computer' },
  { id: 'multiplayer', name: 'Local Multiplayer', description: 'Play with friends' },
]

const navigateToSetup = (mode: string) => {
  navigateTo(`/setup/${mode}`)
}
</script>
