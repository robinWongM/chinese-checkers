import Phaser from 'phaser';
import { gameConfig } from './game/config';
import './styles/style.css';

const game = new Phaser.Game(gameConfig);

document.addEventListener('touchmove', (e) => {
  e.preventDefault();
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);

console.log('Chinese Checkers game initialized!');

(window as any).game = game;
