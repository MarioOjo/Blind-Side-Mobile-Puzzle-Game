import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import typography from '../theme/typography';

export default function PuzzleScreen() {
  return (
    <View style={styles.container}>
      {/* Placeholder screen reserved for the interactive puzzle-play flow. */}
      <Text style={styles.title}>Puzzle</Text>
      <Text style={styles.body}>Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Centered placeholder keeps the future feature entry point obvious.
    flex: 1,
    backgroundColor: colors.midnightNavy,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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

