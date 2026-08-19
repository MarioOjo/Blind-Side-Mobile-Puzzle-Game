import { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import GoogleButton from '../components/GoogleButton';
import PuzzleMark from '../components/PuzzleMark';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';
import { getAuthErrorMessage, loginUser, sendPasswordReset } from '../services/AuthService';

export default function LoginScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const handleGooglePress = () => {
    setErrorMessage('Google sign-in requires a configured development build.');
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isLandscape && styles.landscapeContent]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* The brand badge anchors the top of the auth screen. */}
      <View style={[styles.logoBadge, isLandscape && styles.landscapeLogoBadge, shadows.glowCyan]}>
        <PuzzleMark size={isLandscape ? 24 : 32} />
      </View>
      {/* Wordmark and tagline keep the auth screen aligned with the splash branding. */}
      <Text style={styles.logo}>
        BLIND<Text style={styles.logoAccent}>SIDE</Text>
      </Text>
      <Text style={styles.tagline}>Race. Reveal. Challenge.</Text>
      {/* The card groups the form and alternate sign-in actions into one surface. */}
      <Card style={styles.card}>
        <Text style={styles.heading}>Log In</Text>
        {/* Firebase email/password authentication requires an email address.
            No onFocus/onBlur here: driving a setState from a TextInput's own
            focus event (even one that only touches borderColor) reliably broke
            Android's IME connection on this stack, so the input rows use a
            static border instead of a focus-glow effect. */}
        <View style={styles.inputRow}>
          <Ionicons name="person-outline" size={18} color={colors.neonCyan} style={styles.inputIcon} />
          <TextInput
            ref={emailInputRef}
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.white}
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
        </View>
        {/* Password field includes the reveal toggle for easier testing on mobile. */}
        <View style={styles.inputRow}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.neonCyan} style={styles.inputIcon} />
          <TextInput
            ref={passwordInputRef}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.white}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setErrorMessage('');
            }}
          />
          <Pressable onPress={() => setShowPassword((prev) => !prev)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.5)" style={styles.eyeIcon} />
          </Pressable>
        </View>
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
        {/* The divider separates the primary login path from alternate sign-in options. */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>
        <GoogleButton onPress={handleGooglePress} />
        {/* Secondary action routes to the registration screen inside the auth stack. */}
        <PrimaryButton title="Create Account" variant="outline" onPress={() => navigation.navigate('Register')} />
      </Card>
      <Text style={styles.footerTagline}>Challenge your mind. Beat the clock.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnightNavy,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  landscapeContent: {
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.midnightNavy,
    borderWidth: 1.5,
    borderColor: colors.neonCyan,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  landscapeLogoBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 0,
  },
  logo: {
    color: colors.white,
    fontFamily: typography.logo,
    fontSize: 26,
  },
  logoAccent: {
    color: colors.neonCyan,
  },
  tagline: {
    color: colors.white,
    fontFamily: typography.body,
    fontSize: 14,
    marginBottom: 12,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    gap: 12,
  },
  heading: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 18,
  },
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
    color: '#FCA5A5',
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
  footerTagline: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: typography.body,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
