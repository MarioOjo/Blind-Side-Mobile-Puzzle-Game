import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import ChallengeListItem from '../components/ChallengeListItem';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';
import { mockUser, mockChallenges } from '../constants/mockData';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.avatar, shadows.glowCyan]}>
          <Ionicons name="person" size={36} color={colors.neonCyan} />
        </View>
        <Text style={styles.username}>{mockUser.username}</Text>
        <View style={styles.rankBadge}>
          <Ionicons name="star" size={12} color={colors.midnightNavy} />
          <Text style={styles.rankText}>{mockUser.rank}</Text>
        </View>
      </View>

      <View style={styles.statRow}>
        <Card style={styles.statCard}>
          <Ionicons name="trophy" size={22} color={colors.victoryGold} />
          <Text style={styles.statValue}>{mockUser.wins}</Text>
          <Text style={styles.statLabel}>Wins</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="close-circle" size={22} color="#F87171" />
          <Text style={styles.statValue}>{mockUser.losses}</Text>
          <Text style={styles.statLabel}>Losses</Text>
        </Card>
      </View>
      <Text style={styles.bestTime}>Best Time: {mockUser.bestTimeSeconds}s</Text>

      <Text style={styles.subheading}>Recent Challenges</Text>
      {mockChallenges.map((challenge) => (
        <Card key={challenge.id} style={styles.card}>
          <ChallengeListItem opponent={challenge.opponent} status={challenge.status} time={challenge.time} />
        </Card>
      ))}
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
  header: {
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.midnightNavy,
    borderWidth: 1.5,
    borderColor: colors.neonCyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 20,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.victoryGold,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rankText: {
    color: colors.midnightNavy,
    fontFamily: typography.subheading,
    fontSize: 12,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 20,
  },
  statLabel: {
    color: colors.white,
    fontFamily: typography.body,
    fontSize: 12,
  },
  bestTime: {
    color: colors.white,
    fontFamily: typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
  subheading: {
    color: colors.neonCyan,
    fontFamily: typography.subheading,
    fontSize: 16,
  },
  card: {
    gap: 4,
  },
});

