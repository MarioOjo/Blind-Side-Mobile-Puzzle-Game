import { ScrollView, Text, StyleSheet, useWindowDimensions } from 'react-native';
import colors from '../theme/colors';
import typography from '../theme/typography';

export default function ChallengeScreen() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isLandscape && styles.landscapeContent]}
      showsVerticalScrollIndicator={false}
    >
      {/* Placeholder screen reserved for creating or accepting a challenge. */}
      <Text style={styles.title}>Challenge</Text>
      <Text style={styles.body}>Coming Soon</Text>
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
    gap: 8,
    padding: 24,
  },
  landscapeContent: {
    paddingVertical: 12,
  },
  title: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 20,
  },
  body: {
    color: colors.neonCyan,
    fontFamily: typography.body,
    fontSize: 14,
  },
});

