import { HexPosition, BoardPosition, Player, GameConfig } from '../types';

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

  // Define all 6 corners with their positions
  private static readonly CORNER_POSITIONS: Record<Player, HexPosition[]> = {
    [Player.NONE]: [],
    [Player.NORTH]: [
      { q: 4, r: -8, s: 4 },
      { q: 4, r: -7, s: 3 }, { q: 3, r: -7, s: 4 },
      { q: 4, r: -6, s: 2 }, { q: 3, r: -6, s: 3 }, { q: 2, r: -6, s: 4 },
      { q: 4, r: -5, s: 1 }, { q: 3, r: -5, s: 2 }, { q: 2, r: -5, s: 3 }, { q: 1, r: -5, s: 4 }
    ],
    [Player.NORTH_EAST]: [
      { q: 8, r: -4, s: -4 },
      { q: 7, r: -4, s: -3 }, { q: 7, r: -3, s: -4 },
      { q: 6, r: -4, s: -2 }, { q: 6, r: -3, s: -3 }, { q: 6, r: -2, s: -4 },
      { q: 5, r: -4, s: -1 }, { q: 5, r: -3, s: -2 }, { q: 5, r: -2, s: -3 }, { q: 5, r: -1, s: -4 }
    ],
    [Player.SOUTH_EAST]: [
      { q: 4, r: 4, s: -8 },
      { q: 4, r: 3, s: -7 }, { q: 3, r: 4, s: -7 },
      { q: 4, r: 2, s: -6 }, { q: 3, r: 3, s: -6 }, { q: 2, r: 4, s: -6 },
      { q: 4, r: 1, s: -5 }, { q: 3, r: 2, s: -5 }, { q: 2, r: 3, s: -5 }, { q: 1, r: 4, s: -5 }
    ],
    [Player.SOUTH]: [
      { q: -4, r: 8, s: -4 },
      { q: -4, r: 7, s: -3 }, { q: -3, r: 7, s: -4 },
      { q: -4, r: 6, s: -2 }, { q: -3, r: 6, s: -3 }, { q: -2, r: 6, s: -4 },
      { q: -4, r: 5, s: -1 }, { q: -3, r: 5, s: -2 }, { q: -2, r: 5, s: -3 }, { q: -1, r: 5, s: -4 }
    ],
    [Player.SOUTH_WEST]: [
      { q: -8, r: 4, s: 4 },
      { q: -7, r: 3, s: 4 }, { q: -7, r: 4, s: 3 },
      { q: -6, r: 2, s: 4 }, { q: -6, r: 3, s: 3 }, { q: -6, r: 4, s: 2 },
      { q: -5, r: 1, s: 4 }, { q: -5, r: 2, s: 3 }, { q: -5, r: 3, s: 2 }, { q: -5, r: 4, s: 1 }
    ],
    [Player.NORTH_WEST]: [
      { q: -4, r: -4, s: 8 },
      { q: -4, r: -3, s: 7 }, { q: -3, r: -4, s: 7 },
      { q: -4, r: -2, s: 6 }, { q: -3, r: -3, s: 6 }, { q: -2, r: -4, s: 6 },
      { q: -4, r: -1, s: 5 }, { q: -3, r: -2, s: 5 }, { q: -2, r: -3, s: 5 }, { q: -1, r: -4, s: 5 }
    ]
  };

  static createBoard(config: GameConfig): Map<string, BoardPosition> {
    const board = new Map<string, BoardPosition>();
    
    const add = (q: number, r: number, player: Player, corner?: Player) => {
      const s = -q - r;
      board.set(HexUtils.toKey({ q, r, s }), {
        q, r, s, player, corner
      });
    };

    // Central hexagonal area
    for (let q = -4; q <= 4; q++) {
      for (let r = -4; r <= 4; r++) {
        const s = -q - r;
        if (Math.abs(q) <= 4 && Math.abs(r) <= 4 && Math.abs(s) <= 4) {
          add(q, r, Player.NONE);
        }
      }
    }

    // Add all 6 corners with dynamic player assignment
    const allCorners = [
      Player.NORTH,
      Player.NORTH_EAST,
      Player.SOUTH_EAST,
      Player.SOUTH,
      Player.SOUTH_WEST,
      Player.NORTH_WEST
    ];

    allCorners.forEach(corner => {
      const positions = this.CORNER_POSITIONS[corner];
      const assignedPlayer = config.activePlayers.includes(corner) ? corner : Player.NONE;
      
      positions.forEach(pos => {
        add(pos.q, pos.r, assignedPlayer, corner);
      });
    });

    return board;
  }
}
