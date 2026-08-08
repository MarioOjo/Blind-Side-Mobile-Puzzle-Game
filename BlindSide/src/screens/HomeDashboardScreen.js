import { Fragment } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import PuzzleSessionListItem from '../components/PuzzleSessionListItem';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';
import { mockUser, mockPuzzleSessions } from '../constants/mockData';

// Routes remain connected to placeholder screens until cooperative flows are implemented.
const QUICK_START_ACTIONS = [
  { key: 'puzzle', label: 'New Puzzle', icon: 'extension-puzzle-outline' },
  { key: 'challenge', label: 'Invite Partner', icon: 'person-add-outline' },
  { key: 'results', label: 'Puzzle History', icon: 'trophy-outline' },
];

export default function HomeDashboardScreen({ navigation }) {
  // Centralized handler keeps the button grid easy to expand later.
  const handleQuickStart = (key) => {
    if (key === 'puzzle') navigation.navigate('Puzzle');
    if (key === 'challenge') navigation.navigate('PartnerConnection');
    if (key === 'results') navigation.navigate('Results');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Greeting uses mock user data until real profile state is connected. */}
      <View style={styles.greeting}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.usernameText}>{mockUser.username}</Text>
      </View>

      {/* The quick-start grid surfaces the fastest actions for returning players. */}
      <View style={styles.quickStartRow}>
        {QUICK_START_ACTIONS.map((action) => (
          <Pressable
            key={action.key}
            style={({ pressed }) => [styles.quickStartButton, shadows.glowCyan, pressed && styles.quickStartPressed]}
            onPress={() => handleQuickStart(action.key)}
          >
            <Ionicons name={action.icon} size={28} color={colors.neonCyan} />
            <Text style={styles.quickStartLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.subheading}>Recent Activity</Text>
        <Pressable onPress={() => navigation.navigate('Challenges')}>
          <Text style={styles.viewAllLink}>View All</Text>
        </Pressable>
      </View>
      <Card style={styles.challengesCard}>
        {mockPuzzleSessions.map((session, index) => (
          <Fragment key={session.id}>
            <PuzzleSessionListItem
              partnerName={session.partnerName}
              status={session.status}
              piecesRemaining={session.piecesRemaining}
              lastPlayed={session.lastPlayed}
            />
            {index < mockPuzzleSessions.length - 1 && <View style={styles.divider} />}
          </Fragment>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    // Scroll view lets the dashboard breathe on smaller phones.
    flex: 1,
    backgroundColor: colors.midnightNavy,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  greeting: {
    gap: 2,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: typography.body,
    fontSize: 14,
  },
  usernameText: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 26,
  },
  quickStartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickStartButton: {
    // Cards behave like large tap targets for one-handed use.
    flex: 1,
    aspectRatio: 4 / 5,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.electricBlue,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickStartPressed: {
    opacity: 0.8,
    borderColor: colors.neonCyan,
  },
  quickStartLabel: {
    color: colors.white,
    fontFamily: typography.body,
    fontSize: 11,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subheading: {
    color: colors.neonCyan,
    fontFamily: typography.subheading,
    fontSize: 16,
  },
  viewAllLink: {
    color: colors.neonCyan,
    fontFamily: typography.body,
    fontSize: 12,
  },
  challengesCard: {
    backgroundColor: colors.card,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});

