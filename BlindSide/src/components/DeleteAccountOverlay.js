// Identity-confirmed account deletion dialog (password, or Google for Google-only players) for the Profile screen. Styled to match
// ExitConfirmOverlay, but rendered in a Modal so it covers the scrolling profile
// content and the tab bar, and stays usable with the keyboard open.
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import radii from '../theme/radii';
import typography from '../theme/typography';


export default function DeleteAccountOverlay({
  visible,
  isDeleting,
  requiresPassword = true,
  errorMessage,
  onCancel,
  onConfirm,
}) {
  const [password, setPassword] = useState('');

  // Never keep the password around between openings.
  useEffect(() => {
    if (!visible) setPassword('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Ionicons name="warning-outline" size={36} color={colors.danger} />
          <Text style={styles.eyebrow}>DELETE ACCOUNT</Text>
          <Text style={styles.heading}>Delete your BlindSide account?</Text>
          <Text style={styles.instructionText}>
            This permanently removes your profile, username, solo history, and partner
            connections. Puzzles you finished with a partner stay in their history.
            This can't be undone.
          </Text>
          {requiresPassword ? (
            <TextInput
              style={styles.input}
              placeholder="Confirm with your password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              editable={!isDeleting}
              value={password}
              onChangeText={setPassword}
            />
          ) : (
            <Text style={styles.instructionText}>
              You'll be asked to confirm with your Google account.
            </Text>
          )}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              (pressed || isDeleting || (requiresPassword && !password)) && styles.deleteButtonDimmed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Permanently delete account"
            disabled={isDeleting || (requiresPassword && !password)}
            onPress={() => onConfirm(password)}
          >
            <Text style={styles.deleteButtonLabel}>
              {isDeleting ? 'Deleting...' : requiresPassword ? 'Delete Permanently' : 'Confirm with Google & Delete'}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Keep my account"
            disabled={isDeleting}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonLabel}>Keep My Account</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
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
    borderColor: colors.danger,
    borderRadius: radii.lg,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  eyebrow: {
    color: colors.danger,
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
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    color: colors.white,
    fontFamily: typography.body,
  },
  errorText: {
    color: colors.error,
    fontFamily: typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: colors.danger,
    borderRadius: radii.sm,
    minWidth: 180,
  },
  deleteButtonDimmed: {
    opacity: 0.6,
  },
  deleteButtonLabel: {
    color: colors.midnightNavy,
    fontFamily: typography.subheading,
    fontSize: 15,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelButtonPressed: {
    opacity: 0.6,
  },
  cancelButtonLabel: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
