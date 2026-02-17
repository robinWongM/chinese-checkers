export type PlayerId = 1 | 2;

export interface Cell {
  q: number;
  r: number;
  s: number;
  key: string;
}

export interface Piece {
  id: string;
  player: PlayerId;
  position: string;
}

export interface GameState {
  cells: Cell[];
  cellMap: Map<string, Cell>;
  neighbors: Map<string, string[]>;
  startZones: Record<PlayerId, Set<string>>;
  goalZones: Record<PlayerId, Set<string>>;
  pieces: Piece[];
  currentPlayer: PlayerId;
  selectedPieceId: string | null;
  validMoves: string[];
  winner: PlayerId | null;
}

const STAR_LIMIT = 8;
const HEX_RADIUS = 4;

const DIRECTIONS: [number, number, number][] = [
  [1, -1, 0],
  [1, 0, -1],
  [0, 1, -1],
  [-1, 1, 0],
  [-1, 0, 1],
  [0, -1, 1],
];

export const keyOf = (q: number, r: number, s: number): string => `${q},${r},${s}`;

export const parseKey = (key: string): Cell => {
  const [qText, rText, sText] = key.split(',');
  const q = Number(qText);
  const r = Number(rText);
  const s = Number(sText);

  if ([q, r, s].some((value) => Number.isNaN(value))) {
    throw new Error(`Invalid coordinate key: ${key}`);
  }

  return { q, r, s, key };
};

export const hexDistance = (from: string, to: string): number => {
  const a = parseKey(from);
  const b = parseKey(to);
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
};

const isMainHex = (q: number, r: number, s: number): boolean =>
  Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= HEX_RADIUS;

const isQPositiveArm = (q: number, r: number, s: number): boolean =>
  q >= 5 && q <= STAR_LIMIT && r <= 0 && r >= -HEX_RADIUS && s <= 0 && s >= -HEX_RADIUS;

const isQNegativeArm = (q: number, r: number, s: number): boolean =>
  q <= -5 && q >= -STAR_LIMIT && r >= 0 && r <= HEX_RADIUS && s >= 0 && s <= HEX_RADIUS;

const isRPositiveArm = (q: number, r: number, s: number): boolean =>
  r >= 5 && r <= STAR_LIMIT && q <= 0 && q >= -HEX_RADIUS && s <= 0 && s >= -HEX_RADIUS;

const isRNegativeArm = (q: number, r: number, s: number): boolean =>
  r <= -5 && r >= -STAR_LIMIT && q >= 0 && q <= HEX_RADIUS && s >= 0 && s <= HEX_RADIUS;

const isSPositiveArm = (q: number, r: number, s: number): boolean =>
  s >= 5 && s <= STAR_LIMIT && q <= 0 && q >= -HEX_RADIUS && r <= 0 && r >= -HEX_RADIUS;

const isSNegativeArm = (q: number, r: number, s: number): boolean =>
  s <= -5 && s >= -STAR_LIMIT && q >= 0 && q <= HEX_RADIUS && r >= 0 && r <= HEX_RADIUS;

export const isValidBoardCell = (q: number, r: number, s: number): boolean =>
  isMainHex(q, r, s)
  || isQPositiveArm(q, r, s)
  || isQNegativeArm(q, r, s)
  || isRPositiveArm(q, r, s)
  || isRNegativeArm(q, r, s)
  || isSPositiveArm(q, r, s)
  || isSNegativeArm(q, r, s);

export const createBoardCells = (): Cell[] => {
  const cells: Cell[] = [];
  for (let q = -STAR_LIMIT; q <= STAR_LIMIT; q += 1) {
    for (let r = -STAR_LIMIT; r <= STAR_LIMIT; r += 1) {
      const s = -q - r;
      if (Math.abs(s) > STAR_LIMIT) {
        continue;
      }
      if (!isValidBoardCell(q, r, s)) {
        continue;
      }
      cells.push({ q, r, s, key: keyOf(q, r, s) });
    }
  }
  return cells;
};

export const createNeighbors = (cells: Cell[]): Map<string, string[]> => {
  const keys = new Set(cells.map((cell) => cell.key));
  const neighbors = new Map<string, string[]>();

  for (const cell of cells) {
    const adjacent = DIRECTIONS
      .map(([dq, dr, ds]) => keyOf(cell.q + dq, cell.r + dr, cell.s + ds))
      .filter((candidate) => keys.has(candidate));
    neighbors.set(cell.key, adjacent);
  }

  return neighbors;
};

const createZones = (cells: Cell[]): { start: Record<PlayerId, Set<string>>; goal: Record<PlayerId, Set<string>> } => {
  const start1 = new Set<string>();
  const start2 = new Set<string>();

  for (const cell of cells) {
    if (cell.q <= -5) {
      start1.add(cell.key);
    }
    if (cell.q >= 5) {
      start2.add(cell.key);
    }
  }

  return {
    start: { 1: start1, 2: start2 },
    goal: { 1: start2, 2: start1 },
  };
};

const createPieces = (startZones: Record<PlayerId, Set<string>>): Piece[] => {
  const pieces: Piece[] = [];
  let index = 1;
  for (const position of startZones[1]) {
    pieces.push({ id: `p1-${index}`, player: 1, position });
    index += 1;
  }

  index = 1;
  for (const position of startZones[2]) {
    pieces.push({ id: `p2-${index}`, player: 2, position });
    index += 1;
  }

  return pieces;
};

export const createInitialState = (): GameState => {
  const cells = createBoardCells();
  const cellMap = new Map(cells.map((cell) => [cell.key, cell]));
  const neighbors = createNeighbors(cells);
  const zones = createZones(cells);

  return {
    cells,
    cellMap,
    neighbors,
    startZones: zones.start,
    goalZones: zones.goal,
    pieces: createPieces(zones.start),
    currentPlayer: 1,
    selectedPieceId: null,
    validMoves: [],
    winner: null,
  };
};

export const findPieceById = (state: GameState, pieceId: string | null): Piece | undefined => {
  if (!pieceId) {
    return undefined;
  }
  return state.pieces.find((piece) => piece.id === pieceId);
};

export const pieceMap = (state: GameState): Map<string, Piece> =>
  new Map(state.pieces.map((piece) => [piece.position, piece]));

export const getValidMoves = (state: GameState, pieceId: string): string[] => {
  const piece = findPieceById(state, pieceId);
  if (!piece) {
    return [];
  }

  const occupied = pieceMap(state);
  const moves = new Set<string>();

  for (const adjacent of state.neighbors.get(piece.position) ?? []) {
    if (!occupied.has(adjacent)) {
      moves.add(adjacent);
    }
  }

  const getJumpTargets = (fromKey: string): string[] => {
    const currentCell = state.cellMap.get(fromKey);
    if (!currentCell) {
      return [];
    }

    return DIRECTIONS
      .map(([dq, dr, ds]) => {
        const over = keyOf(currentCell.q + dq, currentCell.r + dr, currentCell.s + ds);
        const landing = keyOf(currentCell.q + dq * 2, currentCell.r + dr * 2, currentCell.s + ds * 2);

        if (!occupied.has(over) || !state.cellMap.has(landing) || occupied.has(landing)) {
          return null;
        }

        return landing;
      })
      .filter((target): target is string => target !== null);
  };

  const queue = [piece.position];
  const visited = new Set<string>([piece.position]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    for (const landing of getJumpTargets(current)) {
      if (!visited.has(landing)) {
        visited.add(landing);
        queue.push(landing);
        moves.add(landing);
      }
    }
  }

  return [...moves];
};

export const applyMove = (state: GameState, pieceId: string, destination: string): GameState => {
  const candidateMoves = getValidMoves(state, pieceId);
  if (!candidateMoves.includes(destination) || state.winner) {
    return state;
  }

  const nextPieces = state.pieces.map((piece) =>
    piece.id === pieceId ? { ...piece, position: destination } : piece,
  );

  const currentPlayer = state.currentPlayer;

  const hasWon = nextPieces
    .filter((piece) => piece.player === currentPlayer)
    .every((piece) => state.goalZones[currentPlayer].has(piece.position));

  return {
    ...state,
    pieces: nextPieces,
    selectedPieceId: null,
    validMoves: [],
    winner: hasWon ? currentPlayer : null,
    currentPlayer: hasWon ? currentPlayer : (currentPlayer === 1 ? 2 : 1),
  };
};
