import { Pressable, Text, StyleSheet } from 'react-native';
import GoogleIcon from './GoogleIcon';
import typography from '../theme/typography';

export default function GoogleButton({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <GoogleIcon size={18} />
      <Text style={styles.label}>Continue with Google</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
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
    backgroundColor: '#F3F4F6',
  },
  label: {
    color: '#1F2937',
    fontFamily: typography.subheading,
    fontSize: 16,
  },
});
