import colors from './colors';

// Glow shadow presets for buttons, badges, and avatar accents.
const shadows = {
  // Cyan glow gives interactive elements a stronger neon edge.
  glowCyan: {
    shadowColor: colors.neonCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  // Gold glow is reserved for victory or rank highlights.
  glowGold: {
    shadowColor: colors.victoryGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
};

export default shadows;
