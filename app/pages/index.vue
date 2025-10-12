<template>
  <div class="h-screen bg-slate-900 flex items-center justify-center">
    <div class="text-white text-center">
      <h1 class="text-2xl font-bold mb-4">Chinese Checkers</h1>
      <p class="text-slate-300 mb-6">Redirecting to menu...</p>
      <div class="inline-flex items-center space-x-2">
        <div class="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
await navigateTo('/menu')
</script>
