export const THEME = {
  // Player and piece colors (direction-based)
  southColor: 0x3B82F6, // Blue - South player
  northColor: 0xEF4444, // Red - North player
  pieceStrokeColor: 0xffffff,

  // Board and hex colors
  defaultHexColor: 0x374151, // Gray
  southStartColor: 0x1e3a8a, // Dark Blue - South starting zone
  northStartColor: 0x7f1d1d, // Dark Red - North starting zone
  southGoalColor: 0x1e3a8a,  // Dark Blue - South goal zone
  northGoalColor: 0x7f1d1d,  // Dark Red - North goal zone
  
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
