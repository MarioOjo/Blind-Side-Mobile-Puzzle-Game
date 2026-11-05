import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import AuthLayout from '../components/AuthLayout';
import AuthTextField from '../components/AuthTextField';
import PrimaryButton from '../components/PrimaryButton';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { completeProfile, getAuthErrorMessage, logoutUser } from '../services/AuthService';
import { isValidUsername, USERNAME_RULES_MESSAGE } from '../models/User';

// Shown once to a player who signed in with Google but has no BlindSide profile yet.
// Partners find each other by username, so the app can't be used without one.
export default function ChooseUsernameScreen({ onComplete }) {
  const [username, setUsername] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!username.trim()) {
      setErrorMessage('Choose a username to continue.');
      return;
    }
    if (!isValidUsername(username)) {
      setErrorMessage(USERNAME_RULES_MESSAGE);
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await completeProfile(username);
      onComplete();
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
      setIsSubmitting(false);
    }
  };

  // Signing out returns to Login; the Google account keeps no profile until a username is chosen.
  const handleUseDifferentAccount = () => {
    logoutUser().catch((error) => {
      setErrorMessage(getAuthErrorMessage(error));
    });
  };

  return (
    <AuthLayout>
      <Text style={styles.heading}>Choose a username</Text>
      <Text style={styles.body}>
        Partners find you by your username. It can't be changed later.
      </Text>
      <AuthTextField
        icon="person-outline"
        placeholder="Username"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isSubmitting}
        value={username}
        onChangeText={(value) => {
          setUsername(value);
          setErrorMessage('');
        }}
      />
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <PrimaryButton
        title={isSubmitting ? 'Saving...' : 'Continue'}
        onPress={handleContinue}
        disabled={isSubmitting}
      />
      <Text
        style={[styles.link, isSubmitting && styles.disabledLink]}
        onPress={isSubmitting ? undefined : handleUseDifferentAccount}
      >
        Use a different account
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
  body: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
  },
  errorText: {
    color: colors.error,
    fontFamily: typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
  link: {
    color: colors.neonCyan,
    fontFamily: typography.body,
    textAlign: 'center',
    marginTop: 4,
  },
  disabledLink: {
    opacity: 0.5,
  },
});
