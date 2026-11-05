import { forwardRef, useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import typography from '../theme/typography';

// Icon-led input row shared by Login and Register. Password fields get a reveal toggle.
// No onFocus/onBlur here: driving a setState from a TextInput's own focus event (even
// one that only touches borderColor) reliably broke Android's IME connection on this
// stack, so the rows use a static border instead of a focus-glow effect.
const AuthTextField = forwardRef(function AuthTextField({ icon, secure = false, ...inputProps }, ref) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.inputRow}>
      <Ionicons name={icon} size={18} color={colors.neonCyan} style={styles.inputIcon} />
      <TextInput
        ref={ref}
        style={styles.input}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secure && !showPassword}
        {...inputProps}
      />
      {secure ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          onPress={() => setShowPassword((prev) => !prev)}
          hitSlop={8}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={colors.textMuted}
            style={styles.eyeIcon}
          />
        </Pressable>
      ) : null}
    </View>
  );
});

export default AuthTextField;

const styles = StyleSheet.create({
  inputRow: {
    // Input rows wrap icon, field, and optional toggle into a single focusable surface.
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.electricBlue,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
  },
  inputIcon: {
    marginRight: 8,
  },
  eyeIcon: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    color: colors.white,
    fontFamily: typography.body,
    minHeight: 44,
  },
});
