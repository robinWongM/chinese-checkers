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
    
    const add = (q: number, r: number, player: Player, z1: boolean, z2: boolean, g1: boolean, g2: boolean) => {
      const s = -q - r;
      board.set(HexUtils.toKey({ q, r, s }), {
        q, r, s, player, isStartZone1: z1, isStartZone2: z2, isGoalZone1: g1, isGoalZone2: g2
      });
    };

    // 简化版两人对战中国跳棋
    // 中心菱形区域（通道）- 使用 axial coordinates
    for (let q = -4; q <= 4; q++) {
      for (let r = -4; r <= 4; r++) {
        const s = -q - r;
        // 限制在菱形范围内
        if (Math.abs(q) <= 4 && Math.abs(r) <= 4 && Math.abs(s) <= 4) {
          add(q, r, Player.NONE, false, false, false, false);
        }
      }
    }

    // 左下三角形 (玩家1，蓝色) - 与红色镜像对称
    // 从外向内：1个，2个，3个，4个（金字塔形状）
    add(-4, 8, Player.PLAYER1, true, false, false, true);  // 第1行，最外层
    
    add(-4, 7, Player.PLAYER1, true, false, false, true);  // 第2行
    add(-3, 7, Player.PLAYER1, true, false, false, true);
    
    add(-4, 6, Player.PLAYER1, true, false, false, true);  // 第3行
    add(-3, 6, Player.PLAYER1, true, false, false, true);
    add(-2, 6, Player.PLAYER1, true, false, false, true);
    
    add(-4, 5, Player.PLAYER1, true, false, false, true);  // 第4行（最靠近中心）
    add(-3, 5, Player.PLAYER1, true, false, false, true);
    add(-2, 5, Player.PLAYER1, true, false, false, true);
    add(-1, 5, Player.PLAYER1, true, false, false, true);

    // 右下三角形 (玩家2，红色) - 尖角向右下
    // 从外向内：4个，3个，2个，1个（金字塔形状）
    add(4, -8, Player.PLAYER2, false, true, true, false);  // 第1行，最外层
    
    add(4, -7, Player.PLAYER2, false, true, true, false);  // 第2行
    add(3, -7, Player.PLAYER2, false, true, true, false);
    
    add(4, -6, Player.PLAYER2, false, true, true, false);  // 第3行
    add(3, -6, Player.PLAYER2, false, true, true, false);
    add(2, -6, Player.PLAYER2, false, true, true, false);
    
    add(4, -5, Player.PLAYER2, false, true, true, false);  // 第4行（最靠近中心）
    add(3, -5, Player.PLAYER2, false, true, true, false);
    add(2, -5, Player.PLAYER2, false, true, true, false);
    add(1, -5, Player.PLAYER2, false, true, true, false);

    return board;
  }
}
