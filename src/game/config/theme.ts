export const THEME = {
  // Player and piece colors
  player1Color: 0x3B82F6, // Blue
  player2Color: 0xEF4444, // Red
  pieceStrokeColor: 0xffffff,

  // Board and hex colors
  defaultHexColor: 0x374151, // Gray
  player1StartColor: 0x1e3a8a, // Dark Blue
  player2StartColor: 0x7f1d1d, // Dark Red
  player1GoalColor: 0x1e3a8a,
  player2GoalColor: 0x7f1d1d,
  
  // Extra corners (for 6-player layout, currently empty)
  cornerNEColor: 0x10B981, // Green - North-East
  cornerSEColor: 0xF59E0B, // Orange - South-East  
  cornerSWColor: 0x8B5CF6, // Purple - South-West
  cornerNWColor: 0xEC4899, // Pink - North-West
  
  hexStrokeColor: 0x6b7280,
  
  // Highlight colors
  validMoveHighlightColor: 0x10B981, // Green
  selectedPieceHighlightColor: 0xFBBF24, // Yellow/Amber

  // Sizing and scaling
  pieceSizeRatio: 0.4, // piece radius = hexSize * ratio
  validMoveSizeRatio: 0.3,
  selectedHighlightSizeRatio: 0.5,

  // Animation timings
  pieceMoveDuration: 300, // ms
};
