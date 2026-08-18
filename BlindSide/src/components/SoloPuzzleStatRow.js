// Displays one played puzzle with historical metadata and its fastest solo completion time.
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { formatElapsedTime } from '../utils/soloRun';
import { humanizeCatalogValue } from '../utils/puzzleCatalog';

export default function SoloPuzzleStatRow({ puzzle }) {
  const metadata = [
    humanizeCatalogValue(puzzle.difficulty),
    humanizeCatalogValue(puzzle.category),
  ].filter(Boolean).join(' · ');

  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Ionicons name="extension-puzzle-outline" size={20} color={colors.neonCyan} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>{puzzle.puzzleName}</Text>
        {metadata ? <Text numberOfLines={1} style={styles.metadata}>{metadata}</Text> : null}
      </View>
      <View style={styles.timeBlock}>
        <Text style={styles.timeLabel}>Best</Text>
        <Text style={styles.time}>{formatElapsedTime(puzzle.completionTime)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.7)',
    borderRadius: 8,
  },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,182,212,0.08)',
    borderRadius: 6,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 14,
  },
  metadata: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.58)',
    fontFamily: typography.body,
    fontSize: 11,
  },
  timeBlock: {
    alignItems: 'flex-end',
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: typography.body,
    fontSize: 9,
  },
  time: {
    marginTop: 1,
    color: colors.victoryGold,
    fontFamily: typography.subheading,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
});