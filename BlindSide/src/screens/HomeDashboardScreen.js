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

const QUICK_START_ACTIONS = [
  { key: 'puzzle', label: 'New Puzzle', icon: 'extension-puzzle-outline' },
  { key: 'partner', label: 'Add Partner', icon: 'person-add-outline' },
  { key: 'results', label: 'Puzzle History', icon: 'trophy-outline' },
];

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

  const handleQuickStart = (key) => {
    if (key === 'puzzle') navigation.navigate('DifficultySelection');
    if (key === 'partner') navigation.navigate('PartnerConnection');
    if (key === 'results') navigation.navigate('Results');
  };

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

      {/* The quick-start grid surfaces the fastest actions for returning players. */}
      <View style={styles.quickStartRow}>
        {QUICK_START_ACTIONS.map((action) => (
          <Pressable
            key={action.key}
            style={({ pressed }) => [
              styles.quickStartButton,
              isLandscape && styles.landscapeQuickStartButton,
              shadows.glowCyan,
              pressed && styles.quickStartPressed,
            ]}
            onPress={() => handleQuickStart(action.key)}
          >
            <Ionicons name={action.icon} size={28} color={colors.neonCyan} />
            <Text style={styles.quickStartLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.subheading}>Puzzle Partners</Text>
        <Pressable onPress={() => navigation.navigate('PartnerConnection')}>
          <Text style={styles.viewAllLink}>Add Partner</Text>
        </Pressable>
      </View>
      <Card style={styles.challengesCard}>
        {isLoading ? <Text style={styles.stateText}>Loading partners...</Text> : null}
        {!isLoading && loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
        {!isLoading && !loadError && dashboard?.partners.length === 0 ? (
          <Text style={styles.stateText}>No partners yet — add one to start playing together.</Text>
        ) : null}
        {!isLoading && !loadError && dashboard?.partners.map((partner, index) => (
          <Fragment key={partner.uid}>
            <View style={styles.partnerRow}>
              <View style={styles.partnerAvatar}>
                <Text style={styles.partnerAvatarText}>{partner.username.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.partnerName}>{partner.username}</Text>
            </View>
            {index < dashboard.partners.length - 1 && <View style={styles.divider} />}
          </Fragment>
        ))}
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.subheading}>Recent Activity</Text>
        <Pressable onPress={() => navigation.navigate('Challenges')}>
          <Text style={styles.viewAllLink}>View All</Text>
        </Pressable>
      </View>
      <Card style={styles.challengesCard}>
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
    // Scroll view lets the dashboard breathe on smaller phones.
    flex: 1,
    backgroundColor: colors.midnightNavy,
  },
  content: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: 24,
    gap: 16,
  },
  landscapeContent: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 12,
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
  landscapeQuickStartButton: {
    aspectRatio: 5 / 2,
    padding: 12,
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
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  partnerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.electricBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerAvatarText: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 16,
  },
  partnerName: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});

