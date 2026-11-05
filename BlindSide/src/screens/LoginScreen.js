import { useRef, useState } from 'react';
import { Alert, Keyboard, View, Text, StyleSheet } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import AuthTextField from '../components/AuthTextField';
import PrimaryButton from '../components/PrimaryButton';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { getAuthErrorMessage, loginUser, sendPasswordReset } from '../services/AuthService';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Enter your email and password.');
      return;
    }

    setErrorMessage('');
    setResetMessage('');
    setIsSubmitting(true);

    try {
      await loginUser(email, password);
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
      setIsSubmitting(false);
    }
  };

  const submitPasswordReset = async (targetEmail) => {
    setErrorMessage('');
    setResetMessage('');
    setIsSendingReset(true);

    try {
      await sendPasswordReset(targetEmail);
      setResetMessage('Check your email for a password reset link.');
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleForgotPassword = () => {
    emailInputRef.current?.blur();
    passwordInputRef.current?.blur();
    Keyboard.dismiss();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setResetMessage('');
      setErrorMessage('Enter your email above, then tap "Forgot Password?" again.');
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send a password reset link to ${trimmedEmail}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => submitPasswordReset(trimmedEmail) },
      ],
    );
  };

  return (
    <AuthLayout>
      <Text style={styles.heading}>Log In</Text>
      {/* Firebase email/password authentication requires an email address. */}
      <AuthTextField
        ref={emailInputRef}
        icon="mail-outline"
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setErrorMessage('');
          setResetMessage('');
        }}
      />
      <AuthTextField
        ref={passwordInputRef}
        icon="lock-closed-outline"
        placeholder="Password"
        secure
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setErrorMessage('');
        }}
      />
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {resetMessage ? <Text style={styles.resetText}>{resetMessage}</Text> : null}
      <PrimaryButton
        title={isSubmitting ? 'Logging In...' : 'Log In'}
        onPress={handleLogin}
        disabled={isSubmitting}
      />
      <Text
        style={[styles.forgotLink, isSendingReset && styles.forgotLinkDisabled]}
        onPress={isSendingReset ? undefined : handleForgotPassword}
      >
        {isSendingReset ? 'Sending...' : 'Forgot Password?'}
      </Text>
      {/* The divider separates logging in from creating a new account. */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>
      {/* Secondary action routes to the registration screen inside the auth stack. */}
      <PrimaryButton title="Create Account" variant="outline" onPress={() => navigation.navigate('Register')} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 18,
  },
  forgotLink: {
    color: colors.neonCyan,
    fontFamily: typography.body,
    textAlign: 'center',
    fontSize: 13,
  },
  forgotLinkDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: colors.error,
    fontFamily: typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
  resetText: {
    color: colors.neonCyan,
    fontFamily: typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.electricBlue,
  },
  dividerText: {
    color: colors.white,
    fontFamily: typography.body,
    fontSize: 12,
  },
});
