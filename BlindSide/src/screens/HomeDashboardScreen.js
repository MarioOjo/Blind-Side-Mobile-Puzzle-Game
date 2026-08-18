import { Fragment, useCallback, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import PuzzleSessionListItem from '../components/PuzzleSessionListItem';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';
import { auth } from '../services/FirebaseConfig';
import {
  getCooperativeSessions,
  getUserProfile,
  getUserProfiles,
} from '../services/FirestoreService';
import {
  getSessionPartnerId,
  indexProfilesByUid,
  presentCooperativeSession,
} from '../utils/cooperativeSessions';

export default function HomeDashboardScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useFocusEffect(useCallback(() => {
    let isActive = true;

    const loadDashboard = async () => {
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
        const hydratedProfiles = await getUserProfiles([...profile.partnerIds, ...sessionPartnerIds]);
        const profilesByUid = indexProfilesByUid(hydratedProfiles);

        if (isActive) {
          setDashboard({
            profile,
            partners: profile.partnerIds.map((partnerId) => profilesByUid[partnerId]).filter(Boolean),
            sessions: sessions.slice(0, 3).map((session) => (
              presentCooperativeSession(session, uid, profilesByUid)
            )),
          });
        }
      } catch (error) {
        if (isActive) setLoadError('Unable to load your dashboard. Please try again.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadDashboard();
    return () => { isActive = false; };
  }, []));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isLandscape && styles.landscapeContent]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.greeting}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.usernameText}>{dashboard?.profile.username ?? 'Puzzle Partner'}</Text>
      </View>

      {/* ── PLAY SOLO ─────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>PLAY SOLO</Text>
      <Card style={[styles.modeCard, styles.soloCard, shadows.glowGold]}>
        <View style={styles.modeCardHeader}>
          <Ionicons name="person-outline" size={24} color={colors.victoryGold} />
          <View style={styles.modeCardText}>
            <Text style={styles.modeCardTitle}>Solo Puzzle</Text>
            <Text style={styles.modeCardSubtitle}>Play at your own pace</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.modeCardButton,
            styles.soloButton,
            pressed && styles.modeCardButtonPressed,
          ]}
          onPress={() => navigation.navigate('DifficultySelection')}
        >
          <Text style={[styles.modeCardButtonText, styles.soloButtonText]}>Start Solo Puzzle</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.victoryGold} />
        </Pressable>
      </Card>

      {/* ── PLAY TOGETHER ──────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>PLAY TOGETHER</Text>
      <Card style={[styles.modeCard, styles.coopCard, shadows.glowCyan]}>
        <View style={styles.modeCardHeader}>
          <Ionicons name="people-outline" size={24} color={colors.neonCyan} />
          <View style={styles.modeCardText}>
            <Text style={styles.modeCardTitle}>Cooperative Puzzle</Text>
            <Text style={styles.modeCardSubtitle}>Play with a partner</Text>
          </View>
        </View>

        {isLoading ? (
          <Text style={styles.stateText}>Loading partners...</Text>
        ) : loadError ? (
          <Text style={styles.errorText}>{loadError}</Text>
        ) : dashboard?.partners.length === 0 ? (
          <Text style={styles.stateText}>Add a partner to play together.</Text>
        ) : (
          <View style={styles.partnerList}>
            {dashboard.partners.map((partner, index) => (
              <Fragment key={partner.uid}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Play with ${partner.username}`}
                  onPress={() => navigation.push('CooperativeTierSelection', {
                    partnerId: partner.uid,
                    partnerName: partner.username,
                  })}
                  style={({ pressed }) => [styles.partnerRow, pressed && styles.partnerRowPressed]}
                >
                  <View style={styles.partnerAvatar}>
                    <Text style={styles.partnerAvatarText}>{partner.username.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.partnerName}>{partner.username}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.neonCyan} />
                </Pressable>
                {index < dashboard.partners.length - 1 && <View style={styles.divider} />}
              </Fragment>
            ))}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.modeCardButton,
            styles.coopButton,
            pressed && styles.modeCardButtonPressed,
          ]}
          onPress={() => navigation.navigate('PartnerConnection')}
        >
          <Text style={[styles.modeCardButtonText, styles.coopButtonText]}>Add Partner</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.neonCyan} />
        </Pressable>
      </Card>

      {/* ── RECENT ACTIVITY ────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.subheading}>Recent Activity</Text>
        <Pressable onPress={() => navigation.navigate('Results')}>
          <Text style={styles.viewAllLink}>View All</Text>
        </Pressable>
      </View>
      <Card style={styles.activityCard}>
        {isLoading ? <Text style={styles.stateText}>Loading activity...</Text> : null}
        {!isLoading && loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
        {!isLoading && !loadError && dashboard?.sessions.length === 0 ? (
          <Text style={styles.stateText}>No puzzles yet — start one with a partner.</Text>
        ) : null}
        {!isLoading && !loadError && dashboard?.sessions.map((session, index) => (
          <Fragment key={session.id}>
            <PuzzleSessionListItem
              partnerName={session.partnerName}
              status={session.status}
              progressLabel={session.progressLabel}
              lastPlayed={session.lastPlayed}
            />
            {index < dashboard.sessions.length - 1 && <View style={styles.divider} />}
          </Fragment>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnightNavy,
  },
  content: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: 24,
    gap: 20,
  },
  landscapeContent: {
    paddingHorizontal: 32,
    paddingVertical: 16,
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
  sectionLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: typography.body,
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
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
  modeCard: {
    padding: 16,
  },
  soloCard: {
    borderColor: colors.victoryGold,
  },
  coopCard: {
    borderColor: colors.neonCyan,
  },
  modeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  modeCardText: {
    flex: 1,
  },
  modeCardTitle: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 17,
  },
  modeCardSubtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: typography.body,
    fontSize: 13,
    marginTop: 1,
  },
  modeCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  modeCardButtonPressed: {
    opacity: 0.85,
  },
  soloButton: {
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  coopButton: {
    backgroundColor: 'rgba(6,182,212,0.12)',
  },
  modeCardButtonText: {
    fontFamily: typography.body,
    fontSize: 14,
  },
  soloButtonText: {
    color: colors.victoryGold,
  },
  coopButtonText: {
    color: colors.neonCyan,
  },
  partnerList: {
    marginBottom: 8,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  partnerRowPressed: {
    backgroundColor: 'rgba(6,182,212,0.08)',
  },
  partnerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.electricBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerAvatarText: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 14,
  },
  partnerName: {
    flex: 1,
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 15,
  },
  activityCard: {
    backgroundColor: colors.card,
  },
  stateText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  errorText: {
    color: '#FCA5A5',
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});