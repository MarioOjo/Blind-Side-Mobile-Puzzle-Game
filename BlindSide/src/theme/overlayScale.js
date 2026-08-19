// Shared sizing/spacing scale for the full-screen gameplay interstitial cards
// (CooperativeOnboardingOverlay, CooperativeTurnOverlay) so tuning one for a
// clipping fix can't drift it out of sync with the other's visual language.
const overlayScale = {
  backdropPadding: 10,
  cardMaxWidth: 420,
  cardPaddingVertical: 12,
  cardPaddingHorizontal: 20,
  cardGap: 6,
  iconSize: 26,
  eyebrowFontSize: 10,
  eyebrowLetterSpacing: 1,
  headingFontSize: 17,
  bodyFontSize: 12,
  bodyLineHeight: 16,
  buttonPaddingVertical: 8,
  buttonPaddingHorizontal: 24,
  buttonMinWidth: 170,
  buttonFontSize: 14,
};

export default overlayScale;
