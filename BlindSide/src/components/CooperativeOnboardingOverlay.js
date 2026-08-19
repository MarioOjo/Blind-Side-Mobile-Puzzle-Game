// One-time full-screen explainer shown before a user's very first cooperative
// turn card, so the pass-the-device mechanic isn't a surprise. Styled to match
// CooperativeTurnOverlay's 'confirming' card.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';

export default function CooperativeOnboardingOverlay({ onDismiss }) {
  return (
    <View style={styles.backdrop}>
      <View style={[styles.card, shadows.glowCyan]}>
        <Ionicons name="swap-horizontal-outline" size={30} color={colors.neonCyan} />
        <Text style={styles.eyebrow}>HOW THIS WORKS</Text>
        <Text style={styles.heading}>Pass the device each turn</Text>
        <Text style={styles.instructionText}>
          You'll take turns holding the phone. After each turn, hand it to
          your partner and tap "I'm ready" to continue.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.confirmButton, pressed && styles.confirmButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Got it, let's play"
          onPress={onDismiss}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.midnightNavy} />
          <Text style={styles.confirmButtonLabel}>Got it, let's play</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    elevation: 30,
    backgroundColor: 'rgba(15,23,42,0.93)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  card: {
    // This overlay only ever renders in landscape (see PuzzleScreen), where
    // vertical space is scarce but width is abundant. maxWidth is generous
    // relative to CooperativeTurnOverlay's so the longer copy here wraps to
    // fewer lines, trading the spare width for the tight height instead of
    // needing a fixed/taller box that can clip on shorter phone screens.
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.neonCyan,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    color: colors.neonCyan,
    fontFamily: typography.subheading,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  heading: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 18,
    textAlign: 'center',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.62)',
    fontFamily: typography.body,
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 17,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
    paddingVertical: 9,
    paddingHorizontal: 28,
    backgroundColor: colors.neonCyan,
    borderRadius: 8,
    minWidth: 180,
  },
  confirmButtonPressed: {
    opacity: 0.82,
  },
  confirmButtonLabel: {
    color: colors.midnightNavy,
    fontFamily: typography.subheading,
    fontSize: 15,
  },
});
