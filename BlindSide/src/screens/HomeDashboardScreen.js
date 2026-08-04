import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import ChallengeListItem from '../components/ChallengeListItem';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';
import { mockUser, mockChallenges } from '../constants/mockData';

const QUICK_START_ACTIONS = [
  { key: 'puzzle', label: 'New Puzzle', icon: 'extension-puzzle-outline' },
  { key: 'challenge', label: 'Challenge Friend', icon: 'person-add-outline' },
  { key: 'results', label: 'View Results', icon: 'trophy-outline' },
];

export default function HomeDashboardScreen({ navigation }) {
  const handleQuickStart = (key) => {
    if (key === 'puzzle') navigation.navigate('Puzzle');
    if (key === 'challenge') navigation.navigate('Challenge');
    if (key === 'results') navigation.navigate('Results');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Welcome back, {mockUser.username}</Text>

      <View style={styles.quickStartRow}>
        {QUICK_START_ACTIONS.map((action) => (
          <Pressable
            key={action.key}
            style={({ pressed }) => [styles.quickStartButton, shadows.glowCyan, pressed && styles.quickStartPressed]}
            onPress={() => handleQuickStart(action.key)}
          >
            <Ionicons name={action.icon} size={24} color={colors.neonCyan} />
            <Text style={styles.quickStartLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.subheading}>Recent Challenges</Text>
      {mockChallenges.map((challenge) => (
        <Card key={challenge.id} style={styles.card}>
          <ChallengeListItem opponent={challenge.opponent} status={challenge.status} time={challenge.time} />
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
  quickStartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickStartButton: {
    flex: 1,
    backgroundColor: colors.midnightNavy,
    borderWidth: 1,
    borderColor: colors.electricBlue,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  quickStartPressed: {
    opacity: 0.8,
  },
  quickStartLabel: {
    color: colors.white,
    fontFamily: typography.body,
    fontSize: 11,
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

