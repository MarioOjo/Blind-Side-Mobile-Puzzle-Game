// Shows the signed-in profile, isolated solo/cooperative stats, recent sessions, and account actions.
import { useCallback, useState } from 'react';
import {
  Image,
  ScrollView,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import PuzzleSessionListItem from '../components/PuzzleSessionListItem';
import SoloPuzzleStatRow from '../components/SoloPuzzleStatRow';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';
import { logoutUser } from '../services/AuthService';
import { auth } from '../services/FirebaseConfig';
import {
  getCompletedSoloSessions,
  getCooperativeSessions,
  getPuzzleImages,
  getUserProfile,
  getUserProfiles,
} from '../services/FirestoreService';
import {
  calculateCooperativeStats,
  getSessionPartnerId,
  indexProfilesByUid,
  presentCooperativeSession,
} from '../utils/cooperativeSessions';
import { calculateSoloStats } from '../utils/soloStats';
import { formatElapsedTime } from '../utils/soloRun';

export default function ProfileScreen() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [soloStats, setSoloStats] = useState(null);
  const [isSoloLoading, setIsSoloLoading] = useState(true);
  const [soloLoadError, setSoloLoadError] = useState('');

  useFocusEffect(useCallback(() => {
    let isActive = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error('No authenticated user.');

        const [profile, sessions] = await Promise.all([
          getUserProfile(uid),
          getCooperativeSessions(uid),
        ]);
        if (!profile) throw new Error('User profile not found.');

        const sessionPartnerIds = sessions.map((session) => getSessionPartnerId(session, uid));
        const partnerProfiles = await getUserProfiles(sessionPartnerIds);
        const profilesByUid = indexProfilesByUid(partnerProfiles);

        if (isActive) {
          setProfileData({
            profile,
            stats: calculateCooperativeStats(sessions, uid),
            recentSessions: sessions.slice(0, 3).map((session) => (
              presentCooperativeSession(session, uid, profilesByUid)
            )),
          });
        }
      } catch (error) {
        if (isActive) setLoadError('Unable to load your profile. Please try again.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadProfile();
    return () => { isActive = false; };
  }, []));

  useFocusEffect(useCallback(() => {
    let isActive = true;

    const loadSoloStats = async () => {
      setIsSoloLoading(true);
      setSoloLoadError('');

      try {
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error('No authenticated user.');
        const [sessions, puzzles] = await Promise.all([
          getCompletedSoloSessions(uid),
          getPuzzleImages(),
        ]);
        if (isActive) setSoloStats(calculateSoloStats(sessions, puzzles));
      } catch (error) {
        if (isActive) setSoloLoadError('Unable to load solo stats.');
      } finally {
        if (isActive) setIsSoloLoading(false);
      }
    };

    loadSoloStats();
    return () => { isActive = false; };
  }, []));

  const handleLogout = async () => {
    setLogoutError('');
    setIsLoggingOut(true);

    try {
      await logoutUser();
    } catch (error) {
      setLogoutError('Unable to sign out. Please try again.');
      setIsLoggingOut(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isLandscape && styles.landscapeContent]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, isLandscape && styles.landscapeAvatar, shadows.glowCyan]}>
          {profileData?.profile.profileImage ? (
            <Image source={{ uri: profileData.profile.profileImage }} style={styles.profileImage} />
          ) : (
            <Ionicons name="person" size={36} color={colors.neonCyan} />
          )}
        </View>
        <Text style={styles.username}>
          {profileData?.profile.username ?? (isLoading ? 'Loading...' : 'Puzzle Partner')}
        </Text>
        <View style={styles.profileBadge}>
          <Ionicons name="people" size={12} color={colors.midnightNavy} />
          <Text style={styles.profileBadgeText}>
            {profileData?.stats.completedSessions > 0 ? 'Puzzle Partner' : 'New Puzzle Partner'}
          </Text>
        </View>
      </View>

      {loadError ? <Text style={styles.loadError}>{loadError}</Text> : null}

      <Text style={styles.subheading}>Solo Stats</Text>
      {isSoloLoading ? <Text style={styles.stateText}>Loading solo stats...</Text> : null}
      {!isSoloLoading && soloLoadError ? (
        <Text style={styles.loadError}>{soloLoadError}</Text>
      ) : null}
      {!isSoloLoading && !soloLoadError ? (
        <>
          <View style={styles.soloStatGrid}>
            <Card style={styles.soloStatCard}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.neonCyan} />
              <Text style={styles.statValue}>{soloStats?.completedPuzzles ?? 0}</Text>
              <Text style={styles.statLabel}>Puzzles Completed</Text>
            </Card>
            <Card style={styles.soloStatCard}>
              <Ionicons name="time-outline" size={20} color={colors.electricBlue} />
              <Text style={styles.statValue}>{formatElapsedTime(soloStats?.totalPlayTime ?? 0)}</Text>
              <Text style={styles.statLabel}>Total Play Time</Text>
            </Card>
            <Card style={styles.soloStatCard}>
              <Ionicons name="speedometer-outline" size={20} color={colors.victoryGold} />
              <Text style={styles.statValue}>
                {soloStats?.fastestCompletionTime === null
                  ? '--'
                  : formatElapsedTime(soloStats?.fastestCompletionTime)}
              </Text>
              <Text style={styles.statLabel}>Fastest Time</Text>
            </Card>
          </View>

          <Text style={styles.soloListHeading}>Personal Bests</Text>
          {soloStats?.puzzleBests.length === 0 ? (
            <Text style={styles.stateText}>Complete a solo puzzle to build your stats.</Text>
          ) : null}
          <View style={styles.soloList}>
            {soloStats?.puzzleBests.map((puzzle) => (
              <SoloPuzzleStatRow key={puzzle.puzzleId} puzzle={puzzle} />
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.subheading}>Cooperative Stats</Text>

      <View style={styles.statRow}>
        <Card style={styles.statCard}>
          <Ionicons name="checkmark-done-circle" size={22} color={colors.neonCyan} />
          <Text style={styles.statValue}>{profileData?.stats.completedSessions ?? 0}</Text>
          <Text style={styles.statLabel}>Puzzles Completed Together</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="people" size={22} color={colors.electricBlue} />
          <Text style={styles.statValue}>{profileData?.stats.partnersPlayedWith ?? 0}</Text>
          <Text style={styles.statLabel}>Played With</Text>
        </Card>
      </View>
      <Text style={styles.piecesPlaced}>
        Pieces Placed Together: {profileData?.stats.piecesPlacedTogether ?? 0}
      </Text>
      {!isLoading && !loadError && profileData?.stats.completedSessions === 0 ? (
        <Text style={styles.emptyStats}>Complete a puzzle with a partner to build your stats.</Text>
      ) : null}

      <Text style={styles.subheading}>Recent Puzzles</Text>
      {isLoading ? <Text style={styles.stateText}>Loading recent puzzles...</Text> : null}
      {!isLoading && !loadError && profileData?.recentSessions.length === 0 ? (
        <Text style={styles.stateText}>No cooperative puzzles yet.</Text>
      ) : null}
      {!isLoading && !loadError && profileData?.recentSessions.map((session) => (
        <Card key={session.id} style={styles.card}>
          <PuzzleSessionListItem
            partnerName={session.partnerName}
            status={session.status}
            lastPlayed={session.lastPlayed}
            showProgress={false}
          />
        </Card>
      ))}

      <View style={styles.logoutSection}>
        {logoutError ? <Text style={styles.logoutError}>{logoutError}</Text> : null}
        <PrimaryButton
          title={isLoggingOut ? 'Signing Out...' : 'Sign Out'}
          onPress={handleLogout}
          disabled={isLoggingOut}
          variant="outline"
        />
      </View>
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
    overflow: 'hidden',
  },
  landscapeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  profileImage: {
    width: '100%',
    height: '100%',
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
  soloStatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  soloStatCard: {
    flexGrow: 1,
    flexBasis: 180,
    alignItems: 'center',
    gap: 4,
  },
  soloListHeading: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 14,
  },
  soloList: {
    gap: 8,
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
  emptyStats: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: typography.body,
    fontSize: 12,
    textAlign: 'center',
  },
  subheading: {
    color: colors.neonCyan,
    fontFamily: typography.subheading,
    fontSize: 16,
  },
  stateText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  loadError: {
    color: '#FCA5A5',
    fontFamily: typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    gap: 4,
  },
  logoutSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  logoutError: {
    color: '#FCA5A5',
    fontFamily: typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
});

