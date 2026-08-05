import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import GoogleButton from '../components/GoogleButton';
import PuzzleMark from '../components/PuzzleMark';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';

export default function LoginScreen({ navigation, onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  return (
    <View style={styles.container}>
      <View style={[styles.logoBadge, shadows.glowCyan]}>
        <PuzzleMark size={32} />
      </View>
      <Text style={styles.logo}>
        BLIND<Text style={styles.logoAccent}>SIDE</Text>
      </Text>
      <Text style={styles.tagline}>Race. Reveal. Challenge.</Text>
      <Card style={styles.card}>
        <Text style={styles.heading}>Log In</Text>
        <View style={[styles.inputRow, focusedField === 'email' && styles.inputRowFocused]}>
          <Ionicons name="person-outline" size={18} color={colors.neonCyan} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Username or Email"
            placeholderTextColor={colors.white}
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
        <View style={[styles.inputRow, focusedField === 'password' && styles.inputRowFocused]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.neonCyan} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.white}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
          />
          <Pressable onPress={() => setShowPassword((prev) => !prev)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.5)" style={styles.eyeIcon} />
          </Pressable>
        </View>
        {/* No real auth call — Sprint 1 simulates a successful login to demo navigation. */}
        <PrimaryButton title="Log In" onPress={onAuthenticated} />
        {/* Decorative only — password reset is not implemented this sprint. */}
        <Text style={styles.forgotLink}>Forgot Password?</Text>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>
        {/* Visual only — no real Google OAuth, reuses the Log In button's placeholder behavior. */}
        <GoogleButton onPress={onAuthenticated} />
        <PrimaryButton title="Create Account" variant="outline" onPress={() => navigation.navigate('Register')} />
      </Card>
      <Text style={styles.footerTagline}>Challenge your mind. Beat the clock.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnightNavy,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
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
    gap: 12,
  },
  heading: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.electricBlue,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
  },
  inputRowFocused: {
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

