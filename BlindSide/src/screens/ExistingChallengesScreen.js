// Displays solo and cooperative achievement milestones computed live from session history.
import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
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
} from '../services/FirestoreService';
import { computeChallenges } from '../utils/challenges';
import colors from '../theme/colors';
import shadows from '../theme/shadows';
import typography from '../theme/typography';

function MilestoneRow({ milestone }) {
  const { unlocked, icon, label, description } = milestone;
  return (
    <View style={[styles.milestoneRow, !unlocked && styles.milestoneRowLocked]}>
      <View style={[styles.milestoneIcon, unlocked ? styles.milestoneIconUnlocked : styles.milestoneIconLocked, unlocked && shadows.glowCyan]}>
        <Ionicons
          name={icon}
          size={22}
          color={unlocked ? colors.neonCyan : 'rgba(255,255,255,0.25)'}
        />
      </View>
      <View style={styles.milestoneText}>
        <Text style={[styles.milestoneLabel, !unlocked && styles.milestoneLabelLocked]}>
          {label}
        </Text>
        <Text style={styles.milestoneDescription}>{description}</Text>
      </View>
      {unlocked ? (
        <Ionicons name="checkmark-circle" size={20} color={colors.neonCyan} />
      ) : (
        <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.2)" />
      )}
    </View>
  );
}

export default function ExistingChallengesScreen() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [groups, setGroups] = useState([]);
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
        const [solo, coop] = await Promise.all([
          getCompletedSoloSessions(uid),
          getCompletedCooperativeSessions(uid),
        ]);
        if (isActive) setGroups(computeChallenges(solo, coop, uid));
      } catch {
        if (isActive) setLoadError('Unable to load challenges. Please try again.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    load();
    return () => { isActive = false; };
  }, []));

  const unlockedTotal = groups.reduce(
    (sum, g) => sum + g.milestones.filter((m) => m.unlocked).length,
    0,
  );
  const total = groups.reduce((sum, g) => sum + g.milestones.length, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isLandscape && styles.landscapeContent]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.heading}>Challenges</Text>
        {!isLoading && !loadError ? (
          <Text style={styles.progress}>{unlockedTotal} / {total} unlocked</Text>
        ) : null}
      </View>

      {isLoading ? <Text style={styles.stateText}>Loading challenges...</Text> : null}
      {!isLoading && loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

      {!isLoading && !loadError && groups.map((group) => (
        <View key={group.key}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          <Card style={styles.groupCard}>
            {group.milestones.map((milestone, index) => (
              <View key={milestone.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <MilestoneRow milestone={milestone} />
              </View>
            ))}
          </Card>
        </View>
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
    gap: 16,
  },
  landscapeContent: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  heading: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 22,
  },
  progress: {
    color: colors.neonCyan,
    fontFamily: typography.subheading,
    fontSize: 13,
  },
  groupLabel: {
    color: colors.neonCyan,
    fontFamily: typography.subheading,
    fontSize: 15,
    marginBottom: 8,
  },
  groupCard: {
    padding: 0,
    gap: 0,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(37,99,235,0.25)',
    marginHorizontal: 16,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  milestoneRowLocked: {
    opacity: 0.55,
  },
  milestoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  milestoneIconUnlocked: {
    borderColor: colors.neonCyan,
    backgroundColor: 'rgba(6,182,212,0.1)',
  },
  milestoneIconLocked: {
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'transparent',
  },
  milestoneText: {
    flex: 1,
    gap: 2,
  },
  milestoneLabel: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 14,
  },
  milestoneLabelLocked: {
    color: 'rgba(255,255,255,0.55)',
  },
  milestoneDescription: {
    color: 'rgba(255,255,255,0.45)',
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
