import { View, Text, StyleSheet } from 'react-native';
import Card from '../components/Card';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { mockUser } from '../constants/mockData';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{mockUser.username}</Text>
      <Card style={styles.card}>
        <Text style={styles.statLabel}>Wins</Text>
        <Text style={styles.statValue}>{mockUser.wins}</Text>
      </Card>
      <Card style={styles.card}>
        <Text style={styles.statLabel}>Losses</Text>
        <Text style={styles.statValue}>{mockUser.losses}</Text>
      </Card>
      <Card style={styles.card}>
        <Text style={styles.statLabel}>Best Time</Text>
        <Text style={styles.statValue}>{mockUser.bestTimeSeconds}s</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnightNavy,
    padding: 24,
    gap: 16,
  },
  heading: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 20,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 15,
  },
  statValue: {
    color: colors.victoryGold,
    fontFamily: typography.heading,
    fontSize: 18,
  },
});

