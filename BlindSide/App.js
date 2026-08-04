import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useFonts, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { Poppins_700Bold, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Inter_400Regular } from '@expo-google-fonts/inter';
import colors from './src/theme/colors';
import typography from './src/theme/typography';
import PrimaryButton from './src/components/PrimaryButton';
import Card from './src/components/Card';

// Temporary design-system preview — replaced by real navigation in a later commit.
export default function App() {
  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
    Poppins_700Bold,
    Poppins_600SemiBold,
    Inter_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>BLINDSIDE</Text>
      <Card style={styles.card}>
        <Text style={styles.heading}>Design System Preview</Text>
        <Text style={styles.body}>Race. Reveal. Challenge.</Text>
        <PrimaryButton title="Primary Button" onPress={() => {}} />
      </Card>
      <StatusBar style="light" />
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
    alignItems: 'center',
  },
  heading: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 18,
  },
  body: {
    color: colors.white,
    fontFamily: typography.body,
    fontSize: 14,
  },
});
