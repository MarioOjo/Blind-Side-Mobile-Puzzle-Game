import { Pressable, Text, StyleSheet } from 'react-native';
import GoogleIcon from './GoogleIcon';
import typography from '../theme/typography';

// Social sign-in button placeholder that matches the current auth screen layout.
export default function GoogleButton({ onPress }) {
  return (
    // The pressable is intentionally simple because the Google flow is not wired yet.
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {/* Reuses the official Google icon for visual familiarity. */}
      <GoogleIcon size={18} />
      <Text style={styles.label}>Continue with Google</Text>
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
    borderRadius: 12,
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
  label: {
    color: '#1F2937',
    fontFamily: typography.subheading,
    fontSize: 16,
  },
});
