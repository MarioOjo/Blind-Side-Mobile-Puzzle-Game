import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import colors from '../theme/colors';
import typography from '../theme/typography';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>BLINDSIDE</Text>
      <Card style={styles.card}>
        <Text style={styles.heading}>Create Account</Text>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={colors.white}
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.white}
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.white}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {/* Submission is not wired to auth logic yet — Sprint 1 is UI only. */}
        <PrimaryButton title="Register" onPress={() => {}} />
        <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
          Already have an account? Log In
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
});

