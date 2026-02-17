<template>
  <main class="game-shell">
    <section class="panel">
      <h1>Chinese Checkers</h1>
      <p class="subtitle">Fresh web rebuild · local 2-player mode</p>

      <div class="status-card">
        <p v-if="gameState.winner" class="winner">🏆 Player {{ gameState.winner }} wins!</p>
        <p v-else>Current turn: <strong>Player {{ gameState.currentPlayer }}</strong></p>
        <p class="hint">Select one of your marbles, then click a highlighted destination.</p>
      </div>

      <div class="legend">
        <div><span class="dot player-1"></span> Player 1 marbles</div>
        <div><span class="dot player-2"></span> Player 2 marbles</div>
        <div><span class="dot legal"></span> Legal destination</div>
      </div>

      <button type="button" class="reset" @click="resetGame">Restart game</button>
    </section>

    <section class="board-wrapper">
      <svg
        class="board"
        viewBox="0 0 1000 860"
        role="img"
        aria-label="Chinese Checkers board"
      >
        <g v-for="cell in cellVisuals" :key="cell.key">
          <circle
            :cx="cell.x"
            :cy="cell.y"
            r="13"
            class="cell"
            :class="{
              'goal-one': gameState.goalZones[1].has(cell.key),
              'goal-two': gameState.goalZones[2].has(cell.key),
            }"
            @click="onCellClick(cell.key)"
          />
        </g>

        <g v-for="move in validMovesVisual" :key="`move-${move.key}`">
          <circle :cx="move.x" :cy="move.y" r="12" class="legal-move" @click="onCellClick(move.key)" />
        </g>

        <g v-for="piece in piecesVisual" :key="piece.id">
          <circle
            :cx="piece.x"
            :cy="piece.y"
            r="16"
            class="piece"
            :class="[
              piece.player === 1 ? 'player-one' : 'player-two',
              gameState.selectedPieceId === piece.id ? 'selected' : '',
            ]"
            @click="onPieceClick(piece.id)"
          />
        </g>
      </svg>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { applyMove, createInitialState, findPieceById, getValidMoves } from '../utils/chineseCheckers';

const gameState = ref(createInitialState());

const toPixel = (q: number, r: number) => {
  const size = 32;
  const x = 500 + size * ((Math.sqrt(3) * q) + ((Math.sqrt(3) / 2) * r));
  const y = 430 + size * (1.5 * r);
  return { x, y };
};

const cellVisuals = computed(() =>
  gameState.value.cells.map((cell) => ({
    ...cell,
    ...toPixel(cell.q, cell.r),
  })),
);

const piecesVisual = computed(() => {
  const lookup = new Map(gameState.value.cells.map((cell) => [cell.key, cell]));
  return gameState.value.pieces.map((piece) => {
    const cell = lookup.get(piece.position);
    if (!cell) {
      return { ...piece, x: 0, y: 0 };
    }
    return { ...piece, ...toPixel(cell.q, cell.r) };
  });
});

const validMovesVisual = computed(() => {
  const lookup = new Map(gameState.value.cells.map((cell) => [cell.key, cell]));
  return gameState.value.validMoves
    .map((key) => {
      const cell = lookup.get(key);
      if (!cell) {
        return null;
      }
      return { key, ...toPixel(cell.q, cell.r) };
    })
    .filter((entry): entry is { key: string; x: number; y: number } => entry !== null);
});

const onPieceClick = (pieceId: string) => {
  if (gameState.value.winner) {
    return;
  }

  const piece = findPieceById(gameState.value, pieceId);
  if (!piece || piece.player !== gameState.value.currentPlayer) {
    return;
  }

  gameState.value = {
    ...gameState.value,
    selectedPieceId: piece.id,
    validMoves: getValidMoves(gameState.value, piece.id),
  };
};

const onCellClick = (cellKey: string) => {
  const selected = gameState.value.selectedPieceId;
  if (!selected) {
    return;
  }

  if (!gameState.value.validMoves.includes(cellKey)) {
    gameState.value = { ...gameState.value, selectedPieceId: null, validMoves: [] };
    return;
  }

  gameState.value = applyMove(gameState.value, selected, cellKey);
};

const resetGame = () => {
  gameState.value = createInitialState();
};
</script>
