// Core BlindSide palette used across navigation, cards, buttons, and placeholder screens.
const colors = {
  // Deep background tone for the app shell.
  midnightNavy: '#0F172A',
  // Primary action color for links, dividers, and emphasis.
  electricBlue: '#2563EB',
  // Accent color used for active states, marks, and call-to-action highlights.
  neonCyan: '#06B6D4',
  // Reward color used for wins, ranking, and success states.
  victoryGold: '#FACC15',
  // Standard text and icon color on dark backgrounds.
  white: '#FFFFFF',
  // Card surface color that sits one step above the background.
  card: '#151C2C',
  // Faded white for placeholders, footers, and other secondary text.
  textMuted: 'rgba(255,255,255,0.5)',
  // Soft red for inline error messages.
  error: '#FCA5A5',
  // Stronger red reserved for destructive actions such as deleting an account.
  danger: '#F87171',
  // Gradient tokens are grouped here so buttons can stay on-brand.
  gradients: {
    primary: ['#2563EB', '#06B6D4'],
  },
};

export default colors;
