// Corner radius scale shared by cards, buttons, inputs, and chips.
// Circular shapes (avatars, badges) keep a radius of half their size instead.
const radii = {
  // Chips, thumbnails, small buttons, and inner tabs.
  sm: 8,
  // Inputs, primary buttons, and grouped controls.
  md: 12,
  // Cards and overlay panels.
  lg: 16,
  // Fully rounded pills and progress tracks.
  pill: 999,
};

export default radii;
