// Presents completed solo-run stats, personal-best feedback, and clean post-game navigation.
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import colors from '../theme/colors';
import shadows from '../theme/shadows';
import typography from '../theme/typography';
import { formatElapsedTime } from '../utils/soloRun';
import { humanizeCatalogValue } from '../utils/puzzleCatalog';

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function SoloCompletionScreen({ navigation, route }) {
  const { width, height } = useWindowDimensions();
  const results = route.params ?? {};

  const goHome = () => navigation.reset({
    index: 0,
    routes: [{ name: 'HomeDashboard' }],
  });

  const tryAgain = () => navigation.replace('Puzzle', {
    puzzleId: results.puzzleId,
    difficulty: results.difficulty,
    category: results.category,
  });

  const startNewPuzzle = () => navigation.replace('DifficultySelection');

  const bestMessage = results.saveError
    ? 'Run could not be saved'
    : results.bestUnavailable
      ? 'Personal best unavailable'
    : results.isPersonalBest
      ? 'New personal best!'
      : `Personal best: ${formatElapsedTime(results.priorBestTime)}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, width > height && styles.landscapeContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.victoryMark, shadows.glowGold]}>
          <Ionicons name="trophy" size={42} color={colors.victoryGold} />
        </View>
        <Text style={styles.heading}>Congratulations!</Text>
        <Text style={styles.puzzleName}>{results.puzzleName ?? 'Puzzle complete'}</Text>

        <View style={styles.statsRow}>
          <Stat label="Time" value={formatElapsedTime(results.completionTime)} />
          <Stat label="Difficulty" value={humanizeCatalogValue(results.difficulty)} />
          <Stat label="Category" value={humanizeCatalogValue(results.category)} />
        </View>

        <View
          style={[
            styles.bestBanner,
            (results.saveError || results.bestUnavailable) && styles.warningBanner,
          ]}
        >
          <Ionicons
            name={results.saveError ? 'cloud-offline-outline' : 'speedometer-outline'}
            size={20}
            color={results.saveError || results.bestUnavailable ? '#FCA5A5' : colors.neonCyan}
          />
          <Text
            style={[
              styles.bestText,
              (results.saveError || results.bestUnavailable) && styles.warningText,
            ]}
          >
            {bestMessage}
          </Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton title="Try Again" onPress={tryAgain} />
          <PrimaryButton title="New Puzzle" onPress={startNewPuzzle} />
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
    borderColor: colors.victoryGold,
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
  statsRow: {
    marginTop: 24,
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
  bestBanner: {
    marginTop: 14,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.neonCyan,
    borderRadius: 8,
    backgroundColor: 'rgba(6,182,212,0.08)',
  },
  warningBanner: {
    borderColor: '#FCA5A5',
    backgroundColor: 'rgba(252,165,165,0.08)',
  },
  bestText: {
    color: colors.neonCyan,
    fontFamily: typography.subheading,
    fontSize: 13,
  },
  warningText: {
    color: '#FCA5A5',
  },
  actions: {
    marginTop: 22,
    gap: 10,
  },
});