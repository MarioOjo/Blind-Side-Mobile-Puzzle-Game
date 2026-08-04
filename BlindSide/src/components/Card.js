import { View, StyleSheet } from 'react-native';
import colors from '../theme/colors';

export default function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.midnightNavy,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.electricBlue,
  },
});

