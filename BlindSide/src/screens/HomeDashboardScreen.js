import { ScrollView, Text, StyleSheet } from 'react-native';
import Card from '../components/Card';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { mockUser, mockChallenges } from '../constants/mockData';

export default function HomeDashboardScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Welcome back, {mockUser.username}</Text>
      <Text style={styles.subheading}>Your Challenges</Text>
      {mockChallenges.map((challenge) => (
        <Card key={challenge.id} style={styles.card}>
          <Text style={styles.cardTitle}>vs {challenge.opponent}</Text>
          <Text style={styles.cardBody}>Category: {challenge.category}</Text>
          <Text style={styles.cardBody}>Status: {challenge.status}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnightNavy,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  heading: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 20,
  },
  subheading: {
    color: colors.neonCyan,
    fontFamily: typography.subheading,
    fontSize: 16,
  },
  card: {
    gap: 4,
  },
  cardTitle: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 15,
  },
  cardBody: {
    color: colors.white,
    fontFamily: typography.body,
    fontSize: 13,
  },
});

