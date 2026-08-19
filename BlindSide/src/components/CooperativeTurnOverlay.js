// Full-screen overlay covering the two cooperative interstitial phases:
//   'confirming' — current player taps to confirm they have the device and start their turn
//                  (used identically at turn 1 and after every handoff)
//   'question'   — both partners tap their own name after discussing the question
// Shares CooperativeOnboardingOverlay's visual language and sizing scale.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';
import scale from '../theme/overlayScale';

function OverlayBackdrop({ children }) {
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
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

export default function CooperativeTurnOverlay({
  phase,
  partnerNames,
  currentPlayerIndex,
  activeQuestion,
  questionConfirmedBy,
  onConfirmReceipt,
  onConfirmQuestion,
  onSkipQuestion,
}) {
  if (phase === 'confirming') {
    const currentName = partnerNames[currentPlayerIndex];
    return (
      <OverlayBackdrop>
        <Ionicons name="hand-left-outline" size={scale.iconSize} color={colors.neonCyan} />
        <Text style={styles.eyebrow}>YOUR TURN</Text>
        <Text style={styles.heading}>{currentName}</Text>
        <Text style={styles.instructionText}>
          Tap the button below when you have the device and are ready to play.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.confirmButton, pressed && styles.confirmButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel={`${currentName} ready to play`}
          onPress={onConfirmReceipt}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color={colors.midnightNavy} />
          <Text style={styles.confirmButtonLabel}>I'm ready</Text>
        </Pressable>
      </OverlayBackdrop>
    );
  }

  if (phase === 'question' && activeQuestion) {
    return (
      <OverlayBackdrop>
        <Ionicons name="chatbubble-ellipses-outline" size={scale.iconSize} color={colors.neonCyan} />
        <Text style={styles.eyebrow}>RELATIONSHIP QUESTION</Text>
        <Text style={styles.questionText}>{activeQuestion.text}</Text>
        <Text style={styles.instructionText}>
          Both partners tap their own name once you've discussed it.
        </Text>
        <View style={styles.questionConfirmRow}>
          {partnerNames.map((name, index) => {
            const confirmed = questionConfirmedBy.includes(index);
            return (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`${name} confirms`}
                disabled={confirmed}
                onPress={() => onConfirmQuestion(index)}
                style={({ pressed }) => [
                  styles.questionConfirmButton,
                  confirmed && styles.questionConfirmButtonDone,
                  !confirmed && pressed && styles.questionConfirmButtonPressed,
                ]}
              >
                {confirmed
                  ? <Ionicons name="checkmark-circle" size={16} color={colors.neonCyan} />
                  : <Ionicons name="ellipse-outline" size={16} color={colors.white} />}
                <Text style={[styles.questionConfirmName, confirmed && styles.questionConfirmNameDone]}>
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Skip this question"
          onPress={onSkipQuestion}
        >
          <Text style={styles.skipButtonLabel}>Skip this question</Text>
        </Pressable>
      </OverlayBackdrop>
    );
  }

  return null;
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
  questionText: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: scale.headingFontSize,
    textAlign: 'center',
    lineHeight: scale.headingFontSize + 5,
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
  questionConfirmRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
    width: '100%',
  },
  questionConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    borderWidth: 1.5,
    borderColor: colors.electricBlue,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
  },
  questionConfirmButtonDone: {
    borderColor: colors.neonCyan,
    backgroundColor: 'rgba(6,182,212,0.12)',
  },
  questionConfirmButtonPressed: {
    backgroundColor: 'rgba(37,99,235,0.18)',
  },
  questionConfirmName: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: scale.buttonFontSize,
  },
  questionConfirmNameDone: {
    color: colors.neonCyan,
  },
  skipButton: {
    marginTop: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonPressed: {
    opacity: 0.6,
  },
  skipButtonLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: typography.body,
    fontSize: 11.5,
    textDecorationLine: 'underline',
  },
});
