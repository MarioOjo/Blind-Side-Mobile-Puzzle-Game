import { Pressable, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';

// Primary CTA button with either a filled gradient or an outline variant.
export default function PrimaryButton({ title, onPress, disabled, variant = 'filled' }) {
  if (variant === 'outline') {
    return (
      // Outline variant is used for secondary actions like navigation or account switching.
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.outlineButton,
          disabled && styles.disabled,
          pressed && !disabled && styles.outlinePressed,
        ]}
      >
        <Text style={styles.outlineLabel}>{title}</Text>
      </Pressable>
    );
  }

  return (
    // Filled variant is the default action style for the most important CTA on a screen.
    <Pressable onPress={onPress} disabled={disabled} style={disabled && styles.disabled}>
      {({ pressed }) => (
        <LinearGradient
          colors={colors.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.button, shadows.glowCyan, pressed && !disabled && styles.pressed]}
        >
          <Text style={styles.label}>{title}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  pressed: {
    // Slight opacity shift gives tap feedback without changing layout.
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 16,
  },
  outlineButton: {
    // Outline styling keeps lower-priority actions visually lighter than the gradient CTA.
    borderWidth: 1.5,
    borderColor: colors.neonCyan,
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  outlinePressed: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
  },
  outlineLabel: {
    color: colors.neonCyan,
    fontFamily: typography.subheading,
    fontSize: 16,
  },
});

