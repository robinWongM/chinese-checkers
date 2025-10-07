# 🌟 Chinese Checkers

A mobile-first Chinese Checkers game built with Phaser 3, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

### Prerequisites
- Bun 1.0+ installed ([Install Bun](https://bun.sh))

### Installation & Running

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Start development server:**
   ```bash
   bun run dev
   ```

3. **Open your browser:**
   - Navigate to `http://localhost:3000`
   - Or scan the QR code shown in terminal with your mobile device

4. **Build for production:**
   ```bash
   bun run build
   ```
   - Output will be in the `dist/` folder
   - Deploy to any static hosting (Netlify, Vercel, GitHub Pages, etc.)

## 🎮 How to Play

### Game Rules
- **Players:** 2 players (Blue vs Red)
- **Objective:** Move all your pieces from your starting triangle to the opposite goal triangle
- **Goal:** First player to get all 10 pieces into the goal wins

### Controls (Mobile Optimized)
1. **Select a piece:** Tap on your colored piece
2. **Valid moves:** Green circles show where you can move
3. **Move:** Tap on a green circle to move there
4. **Deselect:** Tap anywhere else to cancel

### Movement Rules
- **Adjacent Move (相邻移动):** Move to any adjacent empty position (6 directions)
- **Jump Move (跳跃):** Jump over any piece (yours or opponent's) to an empty space beyond
- **Chain Jumps (连续跳):** You can jump multiple times in a single turn - the game will automatically show all possible jump destinations including multi-hop jumps!

## 🛠️ Technology Stack

- **Game Framework:** Phaser 3.80.1
- **Language:** TypeScript 5.3
- **Styling:** Tailwind CSS 3.4
- **Build Tool:** Vite 5.0
- **Architecture:** Hexagonal grid system with cube coordinates

## 📁 Project Structure

```
/
├── src/
│   ├── game/
│   │   ├── config.ts          # Phaser game configuration
│   │   ├── scenes/
│   │   │   └── GameScene.ts   # Main game scene
│   │   ├── objects/
│   │   │   ├── Board.ts       # Board rendering & management
│   │   │   ├── Position.ts    # Hexagonal grid utilities
│   │   │   └── GameLogic.ts   # Game rules & state
│   │   └── types/
│   │       └── index.ts       # TypeScript type definitions
│   ├── styles/
│   │   └── style.css          # Tailwind imports
│   └── main.ts                # Application entry point
├── index.html                 # Main HTML with UI overlay
└── package.json               # Dependencies
```

## 🎨 Features

✅ **Mobile-First Design**
- Touch-optimized controls
- Responsive canvas scaling
- Portrait orientation optimized
- Prevents unwanted zoom/scroll

✅ **Game Features**
- 2-player turn-based gameplay
- Valid move highlighting
- Piece selection feedback
- Win condition detection
- Restart game functionality

✅ **Visual Polish**
- Smooth piece animations
- Color-coded players
- Modern UI with Tailwind
- High-contrast design for visibility

## 🔧 Development

### Available Scripts

- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production
- `bun run preview` - Preview production build locally

### Code Style
- TypeScript strict mode enabled
- ES2020+ modern JavaScript
- Modular architecture
- Strongly typed interfaces

## 📱 Mobile Testing

### Local Network Testing
1. Run `bun run dev`
2. Note your local IP address from the terminal output
3. On your mobile device, navigate to `http://[YOUR_IP]:3000`
4. Make sure both devices are on the same network

### Production Deployment
Deploy the `dist/` folder to:
- **Netlify:** Drag & drop the dist folder
- **Vercel:** `vercel deploy`
- **GitHub Pages:** Push dist folder to gh-pages branch

## 🎯 Future Enhancements

Potential features to add:
- [ ] 3-6 player support
- [ ] AI opponent (single player)
- [ ] Undo move functionality
- [ ] Move history display
- [ ] Sound effects
- [ ] Game state persistence (localStorage)
- [ ] Online multiplayer
- [ ] Animations and particle effects
- [ ] Customizable themes

## 📄 License

MIT License - Feel free to use and modify!

## 🤝 Contributing

Contributions welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

---

**Enjoy the game!** 🎮
