import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import PuzzleSessionListItem from '../components/PuzzleSessionListItem';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';
import { mockUser, mockPuzzleSessions } from '../constants/mockData';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.avatar, shadows.glowCyan]}>
          <Ionicons name="person" size={36} color={colors.neonCyan} />
        </View>
        <Text style={styles.username}>{mockUser.username}</Text>
        <View style={styles.profileBadge}>
          <Ionicons name="people" size={12} color={colors.midnightNavy} />
          <Text style={styles.profileBadgeText}>{mockUser.profileLabel}</Text>
        </View>
      </View>

      <View style={styles.statRow}>
        <Card style={styles.statCard}>
          <Ionicons name="checkmark-done-circle" size={22} color={colors.neonCyan} />
          <Text style={styles.statValue}>{mockUser.puzzlesCompletedTogether}</Text>
          <Text style={styles.statLabel}>Puzzles Completed Together</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="people" size={22} color={colors.electricBlue} />
          <Text style={styles.statValue}>{mockUser.partnersPlayedWith}</Text>
          <Text style={styles.statLabel}>Played With</Text>
        </Card>
      </View>
      <Text style={styles.piecesPlaced}>Pieces Placed Together: {mockUser.piecesPlacedTogether}</Text>

      <Text style={styles.subheading}>Recent Puzzles</Text>
      {mockPuzzleSessions.map((session) => (
        <Card key={session.id} style={styles.card}>
          <PuzzleSessionListItem
            partnerName={session.partnerName}
            status={session.status}
            piecesRemaining={session.piecesRemaining}
            lastPlayed={session.lastPlayed}
            showProgress={false}
          />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Profile is vertically stacked because it is mostly summary data.
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
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.neonCyan,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  profileBadgeText: {
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
    textAlign: 'center',
  },
  piecesPlaced: {
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

