// One-time full-screen explainer shown before a user's very first solo
// puzzle. Solo play itself needs no explanation (familiar drag-and-drop),
// so this covers only the one non-obvious thing: progress autosaves and the
// pause icon lets you save and exit, resumable later from Profile. Shares
// CooperativeOnboardingOverlay's visual language and sizing scale.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';
import scale from '../theme/overlayScale';

export default function SoloOnboardingOverlay({ onDismiss }) {
  return (
    <View style={styles.backdrop}>
      {/* Sizes to content naturally (no fixed card height); scrolls as a
          fallback only if a device's landscape height is still too short
          for the fully-sized card to fit, instead of clipping it. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, shadows.glowCyan]}>
          <Ionicons name="save-outline" size={scale.iconSize} color={colors.neonCyan} />
          <Text style={styles.eyebrow}>GOOD TO KNOW</Text>
          <Text style={styles.heading}>Your progress saves automatically</Text>
          <Text style={styles.instructionText}>
            Tap the pause icon anytime to save and exit — pick up right where
            you left off from Recent Puzzles in your Profile.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.confirmButton, pressed && styles.confirmButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Got it"
            onPress={onDismiss}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.midnightNavy} />
            <Text style={styles.confirmButtonLabel}>Got it</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    elevation: 30,
    backgroundColor: 'rgba(15,23,42,0.93)',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale.backdropPadding,
  },
  card: {
    width: '100%',
    maxWidth: scale.cardMaxWidth,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.neonCyan,
    borderRadius: 14,
    paddingVertical: scale.cardPaddingVertical,
    paddingHorizontal: scale.cardPaddingHorizontal,
    alignItems: 'center',
    gap: scale.cardGap,
  },
  eyebrow: {
    color: colors.neonCyan,
    fontFamily: typography.subheading,
    fontSize: scale.eyebrowFontSize,
    letterSpacing: scale.eyebrowLetterSpacing,
  },
  heading: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: scale.headingFontSize,
    textAlign: 'center',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.62)',
    fontFamily: typography.body,
    fontSize: scale.bodyFontSize,
    textAlign: 'center',
    lineHeight: scale.bodyLineHeight,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
    paddingVertical: scale.buttonPaddingVertical,
    paddingHorizontal: scale.buttonPaddingHorizontal,
    backgroundColor: colors.neonCyan,
    borderRadius: 8,
    minWidth: scale.buttonMinWidth,
  },
  confirmButtonPressed: {
    opacity: 0.82,
  },
  confirmButtonLabel: {
    color: colors.midnightNavy,
    fontFamily: typography.subheading,
    fontSize: scale.buttonFontSize,
  },
});
