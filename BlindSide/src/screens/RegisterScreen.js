import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import AuthTextField from '../components/AuthTextField';
import PrimaryButton from '../components/PrimaryButton';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { getAuthErrorMessage, registerUser } from '../services/AuthService';
import { isValidUsername, USERNAME_RULES_MESSAGE } from '../models/User';

export default function RegisterScreen({
  navigation,
  onRegistrationStateChange = () => {},
}) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password) {
      setErrorMessage('Complete all fields to create your account.');
      return;
    }

    if (!isValidUsername(username)) {
      setErrorMessage(USERNAME_RULES_MESSAGE);
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    onRegistrationStateChange(true);

    try {
      await registerUser(username, email, password);
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      onRegistrationStateChange(false);
    }
  };

  return (
    <AuthLayout>
      <Text style={styles.heading}>Create Account</Text>
      {/* Username is the public handle partners search for; the format is enforced in models/User.js. */}
      <AuthTextField
        icon="person-outline"
        placeholder="Username"
        autoCapitalize="none"
        editable={!isSubmitting}
        value={username}
        onChangeText={(value) => {
          setUsername(value);
          setErrorMessage('');
        }}
      />
      <AuthTextField
        icon="mail-outline"
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        editable={!isSubmitting}
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setErrorMessage('');
        }}
      />
      <AuthTextField
        icon="lock-closed-outline"
        placeholder="Password"
        secure
        editable={!isSubmitting}
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setErrorMessage('');
        }}
      />
      {errorMessage ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss registration error"
            onPress={() => setErrorMessage('')}
            hitSlop={8}
          >
            <Text style={styles.dismissError}>×</Text>
          </Pressable>
        </View>
      ) : null}
      <PrimaryButton
        title={isSubmitting ? 'Creating Account...' : 'Register'}
        onPress={handleRegister}
        disabled={isSubmitting}
      />
      {/* This link returns the user to the login screen inside the same auth stack. */}
      <Text
        style={[styles.link, isSubmitting && styles.disabledLink]}
        onPress={isSubmitting ? undefined : () => navigation.navigate('Login')}
      >
        Already have an account? Log In
      </Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 18,
  },
  link: {
    color: colors.neonCyan,
    fontFamily: typography.body,
    textAlign: 'center',
    marginTop: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    flexShrink: 1,
    color: colors.error,
    fontFamily: typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
  dismissError: {
    color: colors.error,
    fontFamily: typography.subheading,
    fontSize: 20,
    lineHeight: 20,
  },
  disabledLink: {
    opacity: 0.5,
  },
});
