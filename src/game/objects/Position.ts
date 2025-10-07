import { HexPosition, BoardPosition, Player } from '../types';

export class HexUtils {
  static toKey(pos: HexPosition): string {
    return `${pos.q},${pos.r}`;
  }

  static fromKey(key: string): HexPosition {
    const [q, r] = key.split(',').map(Number);
    return { q, r, s: -q - r };
  }

  static equals(a: HexPosition, b: HexPosition): boolean {
    return a.q === b.q && a.r === b.r;
  }

  static distance(a: HexPosition, b: HexPosition): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
  }

  static getNeighbors(pos: HexPosition): HexPosition[] {
    const directions = [
      { q: 1, r: 0, s: -1 },
      { q: 1, r: -1, s: 0 },
      { q: 0, r: -1, s: 1 },
      { q: -1, r: 0, s: 1 },
      { q: -1, r: 1, s: 0 },
      { q: 0, r: 1, s: -1 }
    ];

    return directions.map(dir => ({
      q: pos.q + dir.q,
      r: pos.r + dir.r,
      s: pos.s + dir.s
    }));
  }

  static hexToPixel(pos: HexPosition, size: number): { x: number; y: number } {
    const x = size * (3/2 * pos.q);
    const y = size * (Math.sqrt(3)/2 * pos.q + Math.sqrt(3) * pos.r);
    return { x, y };
  }

  static createBoard(): Map<string, BoardPosition> {
    const board = new Map<string, BoardPosition>();
    
    const add = (q: number, r: number, player: Player, z1: boolean, z2: boolean, g1: boolean, g2: boolean, cornerNE?: boolean, cornerSE?: boolean, cornerSW?: boolean, cornerNW?: boolean) => {
      const s = -q - r;
      board.set(HexUtils.toKey({ q, r, s }), {
        q, r, s, player, isStartZone1: z1, isStartZone2: z2, isGoalZone1: g1, isGoalZone2: g2,
        isCornerNE: cornerNE, isCornerSE: cornerSE, isCornerSW: cornerSW, isCornerNW: cornerNW
      });
    };

    // Central hexagonal area - 6-player board layout
    for (let q = -4; q <= 4; q++) {
      for (let r = -4; r <= 4; r++) {
        const s = -q - r;
        if (Math.abs(q) <= 4 && Math.abs(r) <= 4 && Math.abs(s) <= 4) {
          add(q, r, Player.NONE, false, false, false, false);
        }
      }
    }

    // Corner NE: North-East (Green) - Start with this one
    // Row 4 (tip)
    add(8, -4, Player.NONE, false, false, false, false, true, false, false, false);
    // Row 3
    add(7, -4, Player.NONE, false, false, false, false, true, false, false, false);
    add(7, -3, Player.NONE, false, false, false, false, true, false, false, false);
    // Row 2
    add(6, -4, Player.NONE, false, false, false, false, true, false, false, false);
    add(6, -3, Player.NONE, false, false, false, false, true, false, false, false);
    add(6, -2, Player.NONE, false, false, false, false, true, false, false, false);
    // Row 1 (base)
    add(5, -4, Player.NONE, false, false, false, false, true, false, false, false);
    add(5, -3, Player.NONE, false, false, false, false, true, false, false, false);
    add(5, -2, Player.NONE, false, false, false, false, true, false, false, false);
    add(5, -1, Player.NONE, false, false, false, false, true, false, false, false);

    // Player 2 STARTS HERE - North
    // Row 4 (tip)
    add(4, -8, Player.PLAYER2, false, true, true, false);
    // Row 3
    add(4, -7, Player.PLAYER2, false, true, true, false);
    add(3, -7, Player.PLAYER2, false, true, true, false);
    // Row 2
    add(4, -6, Player.PLAYER2, false, true, true, false);
    add(3, -6, Player.PLAYER2, false, true, true, false);
    add(2, -6, Player.PLAYER2, false, true, true, false);
    // Row 1 (base)
    add(4, -5, Player.PLAYER2, false, true, true, false);
    add(3, -5, Player.PLAYER2, false, true, true, false);
    add(2, -5, Player.PLAYER2, false, true, true, false);
    add(1, -5, Player.PLAYER2, false, true, true, false);

    // Corner SE: South-East (Orange)
    // Row 4 (tip)
    add(4, 4, Player.NONE, false, false, false, false, false, true, false, false);
    // Row 3
    add(4, 3, Player.NONE, false, false, false, false, false, true, false, false);
    add(3, 4, Player.NONE, false, false, false, false, false, true, false, false);
    // Row 2
    add(4, 2, Player.NONE, false, false, false, false, false, true, false, false);
    add(3, 3, Player.NONE, false, false, false, false, false, true, false, false);
    add(2, 4, Player.NONE, false, false, false, false, false, true, false, false);
    // Row 1 (base)
    add(4, 1, Player.NONE, false, false, false, false, false, true, false, false);
    add(3, 2, Player.NONE, false, false, false, false, false, true, false, false);
    add(2, 3, Player.NONE, false, false, false, false, false, true, false, false);
    add(1, 4, Player.NONE, false, false, false, false, false, true, false, false);

    // Corner SW: South-West (Purple)
    // Row 4 (tip)
    add(-8, 4, Player.NONE, false, false, false, false, false, false, true, false);
    // Row 3
    add(-7, 3, Player.NONE, false, false, false, false, false, false, true, false);
    add(-7, 4, Player.NONE, false, false, false, false, false, false, true, false);
    // Row 2
    add(-6, 2, Player.NONE, false, false, false, false, false, false, true, false);
    add(-6, 3, Player.NONE, false, false, false, false, false, false, true, false);
    add(-6, 4, Player.NONE, false, false, false, false, false, false, true, false);
    // Row 1 (base)
    add(-5, 1, Player.NONE, false, false, false, false, false, false, true, false);
    add(-5, 2, Player.NONE, false, false, false, false, false, false, true, false);
    add(-5, 3, Player.NONE, false, false, false, false, false, false, true, false);
    add(-5, 4, Player.NONE, false, false, false, false, false, false, true, false);

    // Player 1 STARTS HERE - South
    // Row 4 (tip)
    add(-4, 8, Player.PLAYER1, true, false, false, true);
    // Row 3
    add(-4, 7, Player.PLAYER1, true, false, false, true);
    add(-3, 7, Player.PLAYER1, true, false, false, true);
    // Row 2
    add(-4, 6, Player.PLAYER1, true, false, false, true);
    add(-3, 6, Player.PLAYER1, true, false, false, true);
    add(-2, 6, Player.PLAYER1, true, false, false, true);
    // Row 1 (base)
    add(-4, 5, Player.PLAYER1, true, false, false, true);
    add(-3, 5, Player.PLAYER1, true, false, false, true);
    add(-2, 5, Player.PLAYER1, true, false, false, true);
    add(-1, 5, Player.PLAYER1, true, false, false, true);

    // Corner NW: North-West (Pink)
    // Row 4 (tip)
    add(-4, -4, Player.NONE, false, false, false, false, false, false, false, true);
    // Row 3
    add(-4, -3, Player.NONE, false, false, false, false, false, false, false, true);
    add(-3, -4, Player.NONE, false, false, false, false, false, false, false, true);
    // Row 2
    add(-4, -2, Player.NONE, false, false, false, false, false, false, false, true);
    add(-3, -3, Player.NONE, false, false, false, false, false, false, false, true);
    add(-2, -4, Player.NONE, false, false, false, false, false, false, false, true);
    // Row 1 (base)
    add(-4, -1, Player.NONE, false, false, false, false, false, false, false, true);
    add(-3, -2, Player.NONE, false, false, false, false, false, false, false, true);
    add(-2, -3, Player.NONE, false, false, false, false, false, false, false, true);
    add(-1, -4, Player.NONE, false, false, false, false, false, false, false, true);

    return board;
  }
}
