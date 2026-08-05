import { View, StyleSheet } from 'react-native';
import colors from '../theme/colors';

// Shared dark card surface for forms, summaries, and list groups.
export default function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    // The border and surface color help cards read as separate panels on the navy background.
    backgroundColor: colors.midnightNavy,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.electricBlue,
  },
});

