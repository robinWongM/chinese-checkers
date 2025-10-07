import { Player } from '../types';

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
    const playerName = currentPlayer === Player.PLAYER1 ? 'Player 1' : 'Player 2';
    const playerColor = currentPlayer === Player.PLAYER1 ? 'text-blue-400' : 'text-red-400';
    
    this.playerTurnElement.innerHTML = `<span class="${playerColor}">${playerName}'s Turn</span>`;
  }

  public showWinMessage(winner: Player): void {
    const winnerName = winner === Player.PLAYER1 ? 'Player 1' : 'Player 2';
    const winnerColor = winner === Player.PLAYER1 ? 'text-blue-400' : 'text-red-400';
      
    this.winnerTextElement.innerHTML = `<span class="${winnerColor}">${winnerName} Wins!</span>`;
    this.winMessageElement.classList.remove('hidden');
  }

  public hideWinMessage(): void {
    this.winMessageElement.classList.add('hidden');
  }
}
