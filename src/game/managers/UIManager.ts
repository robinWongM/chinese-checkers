import { Player, PlayerInfo } from '../types';

export class UIManager {
  private playerTurnElement: HTMLElement;
  private winMessageElement: HTMLElement;
  private winnerTextElement: HTMLElement;
  private restartBtn: HTMLElement;
  private newGameBtn: HTMLElement;
  private exportBtn: HTMLElement;
  private importBtn: HTMLElement;

  constructor(
    private onRestart: () => void,
    private onExport: () => void,
    private onImport: () => void,
  ) {
    this.playerTurnElement = document.getElementById('player-turn')!;
    this.winMessageElement = document.getElementById('win-message')!;
    this.winnerTextElement = document.getElementById('winner-text')!;
    this.restartBtn = document.getElementById('restart-btn')!;
    this.newGameBtn = document.getElementById('new-game-btn')!;
    this.exportBtn = document.getElementById('export-btn')!;
    this.importBtn = document.getElementById('import-btn')!;

    this.setupButtonListeners();
  }

  private setupButtonListeners(): void {
    this.restartBtn.onclick = () => this.onRestart();
    this.newGameBtn.onclick = () => this.onRestart();
    this.exportBtn.onclick = () => this.onExport();
    this.importBtn.onclick = () => this.onImport();
  }

  public updateTurn(currentPlayer: Player): void {
    const playerName = PlayerInfo.getName(currentPlayer);
    const colorCode = PlayerInfo.getColor(currentPlayer);
    const playerColor = this.getColorClass(colorCode);
    
    this.playerTurnElement.innerHTML = `<span class="${playerColor}">${playerName}'s Turn</span>`;
  }
  
  private getColorClass(colorCode: number): string {
    // Map hex colors to Tailwind classes
    switch (colorCode) {
      case 0xEF4444: return 'text-red-400';      // North
      case 0x10B981: return 'text-green-400';    // North-East
      case 0xF59E0B: return 'text-orange-400';   // South-East
      case 0x3B82F6: return 'text-blue-400';     // South
      case 0x8B5CF6: return 'text-purple-400';   // South-West
      case 0xEC4899: return 'text-pink-400';     // North-West
      default: return 'text-gray-400';
    }
  }

  public showWinMessage(winner: Player): void {
    const winnerName = PlayerInfo.getName(winner);
    const colorCode = PlayerInfo.getColor(winner);
    const winnerColor = this.getColorClass(colorCode);
      
    this.winnerTextElement.innerHTML = `<span class="${winnerColor}">${winnerName} Wins!</span>`;
    this.winMessageElement.classList.remove('hidden');
  }

  public hideWinMessage(): void {
    this.winMessageElement.classList.add('hidden');
  }
}
