import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { getAuthErrorMessage, registerUser } from '../services/AuthService';

export default function RegisterScreen({ navigation }) {
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

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await registerUser(username, email, password);
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Simple wordmark keeps the register screen visually aligned with login. */}
      <Text style={styles.logo}>BLINDSIDE</Text>
      {/* The card groups sign-up inputs and the auth action into one panel. */}
      <Card style={styles.card}>
        <Text style={styles.heading}>Create Account</Text>
        {/* Username will likely map to the profile handle in a future sprint. */}
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={colors.white}
          autoCapitalize="none"
          value={username}
          onChangeText={(value) => {
            setUsername(value);
            setErrorMessage('');
          }}
        />
        {/* Email and password fields are already in place for the upcoming auth implementation. */}
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
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.white}
          secureTextEntry
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setErrorMessage('');
          }}
        />
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <PrimaryButton
          title={isSubmitting ? 'Creating Account...' : 'Register'}
          onPress={handleRegister}
          disabled={isSubmitting}
        />
        {/* This link returns the user to the login screen inside the same auth stack. */}
        <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
          Already have an account? Log In
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Register uses the same centered layout as login for consistency.
    flex: 1,
    backgroundColor: colors.midnightNavy,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: 24,
  },
  logo: {
    color: colors.neonCyan,
    fontFamily: typography.logo,
    fontSize: 28,
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
  input: {
    borderWidth: 1,
    borderColor: colors.electricBlue,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.white,
    fontFamily: typography.body,
    minHeight: 44,
  },
  link: {
    color: colors.neonCyan,
    fontFamily: typography.body,
    textAlign: 'center',
    marginTop: 4,
  },
  errorText: {
    color: '#FCA5A5',
    fontFamily: typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
});

