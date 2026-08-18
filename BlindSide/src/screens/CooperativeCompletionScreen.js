// Presents cooperative-run stats after the puzzle is complete.
// No personal-best comparison — this mode is about communication, not speed.
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import colors from '../theme/colors';
import shadows from '../theme/shadows';
import typography from '../theme/typography';
import { formatElapsedTime } from '../utils/soloRun';

function Stat({ label, value, accent = false }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text numberOfLines={1} style={[styles.statValue, accent && styles.statValueAccent]}>
        {value}
      </Text>
    </View>
  );
}

export default function CooperativeCompletionScreen({ navigation, route }) {
  const { width, height } = useWindowDimensions();
  const results = route.params ?? {};

  const tryAgain = () => navigation.replace('Puzzle', {
    puzzleId: results.puzzleId,
    partnerId: results.partnerId,
    partnerName: results.partnerName,
    tier: results.tier,
  });

  const goHome = () => navigation.reset({
    index: 0,
    routes: [{ name: 'HomeDashboard' }],
  });

  const startNewPuzzle = () => navigation.reset({
    index: 1,
    routes: [
      { name: 'HomeDashboard' },
      { name: 'CooperativeTierSelection' },
    ],
  });

  const questionsAnswered = results.questionsAnswered ?? 0;
  const questionsSkipped = results.questionsSkipped ?? 0;
  const totalQuestions = questionsAnswered + questionsSkipped;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, width > height && styles.landscapeContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.victoryMark, shadows.glowCyan]}>
          <Ionicons name="people-circle-outline" size={42} color={colors.neonCyan} />
        </View>
        <Text style={styles.heading}>Puzzle Complete!</Text>
        <Text style={styles.puzzleName}>{results.puzzleName ?? 'Cooperative puzzle'}</Text>

        <View style={styles.partnerRow}>
          <Ionicons name="person-outline" size={14} color="rgba(255,255,255,0.45)" />
          <Text style={styles.partnerText}>with {results.partnerName ?? 'Partner'}</Text>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Time" value={formatElapsedTime(results.completionTime)} />
          <Stat label="Turns" value={String(results.turnCount ?? 0)} />
        </View>

        <View style={styles.statsRow}>
          <Stat
            label="Questions discussed"
            value={totalQuestions === 0 ? '—' : `${questionsAnswered} of ${totalQuestions}`}
            accent={questionsAnswered > 0}
          />
          <Stat
            label="Skipped"
            value={questionsSkipped === 0 ? '—' : String(questionsSkipped)}
          />
        </View>

        <View style={styles.actions}>
          <PrimaryButton title="Try Again" onPress={tryAgain} />
          <PrimaryButton title="New Cooperative Puzzle" onPress={startNewPuzzle} />
          <PrimaryButton title="Home" variant="outline" onPress={goHome} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnightNavy,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  landscapeContent: {
    paddingVertical: 18,
  },
  victoryMark: {
    width: 76,
    height: 76,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neonCyan,
    borderRadius: 8,
  },
  heading: {
    marginTop: 18,
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 28,
    textAlign: 'center',
  },
  puzzleName: {
    marginTop: 5,
    color: colors.neonCyan,
    fontFamily: typography.subheading,
    fontSize: 16,
    textAlign: 'center',
  },
  partnerRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  partnerText: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: typography.body,
    fontSize: 13,
  },
  statsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.electricBlue,
    borderRadius: 8,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.58)',
    fontFamily: typography.body,
    fontSize: 11,
  },
  statValue: {
    marginTop: 4,
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 15,
  },
  statValueAccent: {
    color: colors.neonCyan,
  },
  actions: {
    marginTop: 24,
    gap: 10,
  },
});
