// Chronological run history with separate solo and cooperative tabs.
import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import { auth } from '../services/FirebaseConfig';
import {
  getCompletedCooperativeSessions,
  getCompletedSoloSessions,
  getPuzzleImages,
  getUserProfiles,
} from '../services/FirestoreService';
import { presentSoloResult, presentCoopResult } from '../utils/challenges';
import { indexProfilesByUid, getSessionPartnerId } from '../utils/cooperativeSessions';
import { formatElapsedTime } from '../utils/soloRun';
import colors from '../theme/colors';
import typography from '../theme/typography';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDate(timestamp) {
  const date = timestamp?.toDate?.() ?? (timestamp instanceof Date ? timestamp : null);
  if (!date) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function Chip({ label }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

// ─── row components ───────────────────────────────────────────────────────────

function SoloResultRow({ result }) {
  return (
    <Card style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle} numberOfLines={1}>{result.puzzleName}</Text>
        <Text style={styles.resultDate}>{formatDate(result.completedAt)}</Text>
      </View>
      <View style={styles.chipRow}>
        {result.difficulty ? <Chip label={result.difficulty} /> : null}
        {result.category ? <Chip label={result.category} /> : null}
      </View>
      <View style={styles.resultStats}>
        <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.45)" />
        <Text style={styles.resultStatText}>{formatElapsedTime(result.completionTime)}</Text>
      </View>
    </Card>
  );
}

function CoopResultRow({ result }) {
  const totalQ = result.questionsAnswered + result.questionsSkipped;
  return (
    <Card style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle} numberOfLines={1}>{result.puzzleName}</Text>
        <Text style={styles.resultDate}>{formatDate(result.completedAt)}</Text>
      </View>
      <View style={styles.resultPartnerRow}>
        <Ionicons name="person-outline" size={12} color="rgba(255,255,255,0.45)" />
        <Text style={styles.resultPartnerText}>with {result.partnerName}</Text>
        {result.tier ? <Chip label={result.tier} /> : null}
      </View>
      <View style={styles.resultStatsRow}>
        <View style={styles.resultStats}>
          <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.45)" />
          <Text style={styles.resultStatText}>{formatElapsedTime(result.completionTime)}</Text>
        </View>
        <View style={styles.resultStats}>
          <Ionicons name="swap-horizontal-outline" size={13} color="rgba(255,255,255,0.45)" />
          <Text style={styles.resultStatText}>{result.turnCount} turns</Text>
        </View>
        {totalQ > 0 ? (
          <View style={styles.resultStats}>
            <Ionicons name="chatbubble-ellipses-outline" size={13} color="rgba(255,255,255,0.45)" />
            <Text style={styles.resultStatText}>
              {result.questionsAnswered}/{totalQ} questions
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

// ─── tab bar ─────────────────────────────────────────────────────────────────

function TabBar({ activeTab, onSelect }) {
  return (
    <View style={styles.tabBar}>
      {['solo', 'coop'].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.tabActive]}
          onPress={() => onSelect(tab)}
          activeOpacity={0.75}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
            {tab === 'solo' ? 'Solo' : 'Cooperative'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function ResultsScreen() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [activeTab, setActiveTab] = useState('solo');
  const [soloResults, setSoloResults] = useState([]);
  const [coopResults, setCoopResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useFocusEffect(useCallback(() => {
    let isActive = true;

    const load = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error('No authenticated user.');

        const [soloSessions, coopSessions, puzzles] = await Promise.all([
          getCompletedSoloSessions(uid),
          getCompletedCooperativeSessions(uid),
          getPuzzleImages().catch(() => []),
        ]);

        const partnerIds = coopSessions.map((s) => getSessionPartnerId(s, uid));
        const partnerProfiles = await getUserProfiles(partnerIds);
        const profilesByUid = indexProfilesByUid(partnerProfiles);

        if (isActive) {
          setSoloResults(soloSessions.map((s) => presentSoloResult(s, puzzles)));
          setCoopResults(coopSessions.map((s) => presentCoopResult(s, uid, profilesByUid, puzzles)));
        }
      } catch (error) {
        if (isActive) setLoadError(`Unable to load results: ${error?.message ?? error}`);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    load();
    return () => { isActive = false; };
  }, []));

  const activeResults = activeTab === 'solo' ? soloResults : coopResults;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isLandscape && styles.landscapeContent]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Results</Text>
      <TabBar activeTab={activeTab} onSelect={setActiveTab} />

      {isLoading ? <Text style={styles.stateText}>Loading results...</Text> : null}
      {!isLoading && loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

      {!isLoading && !loadError && activeResults.length === 0 ? (
        <Text style={styles.stateText}>
          {activeTab === 'solo'
            ? 'No solo puzzles completed yet.'
            : 'No cooperative puzzles completed yet.'}
        </Text>
      ) : null}

      {!isLoading && !loadError && activeResults.map((result) => (
        activeTab === 'solo'
          ? <SoloResultRow key={result.id} result={result} />
          : <CoopResultRow key={result.id} result={result} />
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
    flexGrow: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: 24,
    gap: 12,
  },
  landscapeContent: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    gap: 10,
  },
  heading: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 22,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: colors.card,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.electricBlue,
  },
  tabText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: typography.subheading,
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.white,
  },
  resultCard: {
    gap: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultTitle: {
    flex: 1,
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 14,
  },
  resultDate: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: typography.body,
    fontSize: 11,
    flexShrink: 0,
  },
  resultPartnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  resultPartnerText: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: typography.body,
    fontSize: 12,
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: 'rgba(37,99,235,0.25)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: {
    color: colors.neonCyan,
    fontFamily: typography.body,
    fontSize: 11,
  },
  resultStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  resultStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultStatText: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: typography.body,
    fontSize: 12,
  },
  stateText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: typography.body,
    fontSize: 13,
  },
  errorText: {
    color: '#FCA5A5',
    fontFamily: typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
});
