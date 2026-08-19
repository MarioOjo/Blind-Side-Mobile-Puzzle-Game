// Confirmation shown when a player tries to leave mid-puzzle (hardware back,
// header back arrow, or the in-screen Pause icon), for both solo and
// cooperative modes. Styled to match CooperativeTurnOverlay/
// CooperativeOnboardingOverlay; sits above them (higher zIndex) since it can
// be triggered while either of those is already on screen, e.g. during the
// cooperative 'confirming' handoff phase.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';

export default function ExitConfirmOverlay({
  visible,
  isCooperative,
  partnerName,
  onResume,
  onSaveAndExit,
}) {
  if (!visible) return null;

  const heading = isCooperative
    ? `Leave this puzzle with ${partnerName}?`
    : 'Leave this puzzle?';

  return (
    <View style={styles.backdrop}>
      <View style={[styles.card, shadows.glowCyan]}>
        <Ionicons name="pause-circle-outline" size={36} color={colors.neonCyan} />
        <Text style={styles.eyebrow}>PAUSE</Text>
        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.instructionText}>
          Your progress is saved automatically — pick up right where you left off, anytime.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.resumeButton, pressed && styles.resumeButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Resume puzzle"
          onPress={onResume}
        >
          <Ionicons name="play-outline" size={18} color={colors.midnightNavy} />
          <Text style={styles.resumeButtonLabel}>Resume</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.exitButton, pressed && styles.exitButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Save and exit to Home"
          onPress={onSaveAndExit}
        >
          <Text style={styles.exitButtonLabel}>Save &amp; Exit</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 40,
    backgroundColor: 'rgba(15,23,42,0.93)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.neonCyan,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 12,
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
    fontSize: 20,
    textAlign: 'center',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.62)',
    fontFamily: typography.body,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: colors.neonCyan,
    borderRadius: 8,
    minWidth: 180,
  },
  resumeButtonPressed: {
    opacity: 0.82,
  },
  resumeButtonLabel: {
    color: colors.midnightNavy,
    fontFamily: typography.subheading,
    fontSize: 15,
  },
  exitButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  exitButtonPressed: {
    opacity: 0.6,
  },
  exitButtonLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: typography.body,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
