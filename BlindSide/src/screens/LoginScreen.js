import { useState } from 'react';
import {
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
import { getAuthErrorMessage, loginUser } from '../services/AuthService';

export default function LoginScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Enter your email and password.');
      return;
    }

    setErrorMessage('');
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
        {/* Firebase email/password authentication requires an email address. */}
        <View style={[styles.inputRow, focusedField === 'email' && styles.inputRowFocused]}>
          <Ionicons name="person-outline" size={18} color={colors.neonCyan} style={styles.inputIcon} />
          <TextInput
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
            }}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
        {/* Password field includes the reveal toggle for easier testing on mobile. */}
        <View style={[styles.inputRow, focusedField === 'password' && styles.inputRowFocused]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.neonCyan} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.white}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setErrorMessage('');
            }}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
          />
          <Pressable onPress={() => setShowPassword((prev) => !prev)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.5)" style={styles.eyeIcon} />
          </Pressable>
        </View>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <PrimaryButton
          title={isSubmitting ? 'Logging In...' : 'Log In'}
          onPress={handleLogin}
          disabled={isSubmitting}
        />
        {/* Future work: wire up password reset and verification once auth is implemented. */}
        <Text style={styles.forgotLink}>Forgot Password?</Text>
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
  inputRowFocused: {
    // Focus state shifts the border and glow to the accent cyan.
    borderColor: colors.neonCyan,
    ...shadows.glowCyan,
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
  errorText: {
    color: '#FCA5A5',
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

