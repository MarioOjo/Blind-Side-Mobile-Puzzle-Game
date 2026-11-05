import { Pressable, Text, StyleSheet } from 'react-native';
import GoogleIcon from './GoogleIcon';
import radii from '../theme/radii';
import typography from '../theme/typography';

// Google sign-in button shown on Login and Register when the build supports it.
export default function GoogleButton({ onPress, disabled = false, title = 'Continue with Google' }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {/* Reuses the official Google icon for visual familiarity. */}
      <GoogleIcon size={18} />
      <Text style={styles.label}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    // White surface mirrors the canonical Google sign-in treatment.
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  pressed: {
    // Small tonal shift provides feedback while preserving the white button style.
    backgroundColor: '#F3F4F6',
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    color: '#1F2937',
    fontFamily: typography.subheading,
    fontSize: 16,
  },
});
