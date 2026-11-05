// Lets a signed-in user find an exact username, send partner requests, and answer requests sent to them.
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { auth } from '../services/FirebaseConfig';
import {
  acceptPartnerRequest,
  deletePartnerRequest,
  getIncomingPartnerRequests,
  getOutgoingPartnerRequests,
  getPartnerRequestStatus,
  searchUserByUsername,
  sendPartnerRequest,
} from '../services/PartnerService';
import colors from '../theme/colors';
import typography from '../theme/typography';

const PARTNER_ERROR_MESSAGES = {
  'partner/cannot-add-self': 'You cannot add yourself as a partner.',
  'partner/invalid-username': 'Enter a username to search.',
  'partner/user-not-found': 'That player profile is no longer available.',
  'partner/already-connected': 'You are already connected with this player.',
  'partner/inconsistent-connection': 'This partnership needs support before it can be changed.',
  'partner/request-not-found': 'That request is no longer available.',
};

function getPartnerErrorMessage(error) {
  return PARTNER_ERROR_MESSAGES[error?.code] ?? 'Unable to connect right now. Please try again.';
}

function Avatar({ username }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{username.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

export default function PartnerConnectionScreen({ currentUser, navigation } = {}) {
  const signedInUser = currentUser === undefined ? auth.currentUser : currentUser;
  const [username, setUsername] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  // 'incoming' | 'outgoing' | null for the searched player.
  const [searchRequestStatus, setSearchRequestStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);

  const showMessage = (text, success = false) => {
    setMessage(text);
    setIsSuccess(success);
  };

  const loadRequests = useCallback(async () => {
    if (!signedInUser) return;
    try {
      const [incoming, outgoing] = await Promise.all([
        getIncomingPartnerRequests(signedInUser.uid),
        getOutgoingPartnerRequests(signedInUser.uid),
      ]);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (error) {
      showMessage('Unable to load partner requests right now.');
    }
  }, [signedInUser]);

  useFocusEffect(useCallback(() => {
    loadRequests();
  }, [loadRequests]));

  const handleSearch = async () => {
    if (!signedInUser) {
      showMessage('Sign in before searching for a partner.');
      return;
    }

    setSearchResult(null);
    setSearchRequestStatus(null);
    showMessage('');
    setIsSearching(true);

    try {
      const result = await searchUserByUsername(username, signedInUser.uid);
      if (!result) {
        showMessage('No player found with that exact username.');
      } else {
        setSearchResult(result);
        if (result.partnerIds.includes(signedInUser.uid)) {
          showMessage('You are already connected with this player.');
        } else {
          setSearchRequestStatus(await getPartnerRequestStatus(signedInUser.uid, result.id));
        }
      }
    } catch (error) {
      showMessage(getPartnerErrorMessage(error));
    } finally {
      setIsSearching(false);
    }
  };

  const goToTierSelection = (partnerId, partnerName) => {
    navigation?.push('CooperativeTierSelection', { partnerId, partnerName });
  };

  const handleAccept = async (fromUid, fromUsername) => {
    setBusyRequestId(fromUid);
    showMessage('');

    try {
      await acceptPartnerRequest(signedInUser.uid, fromUid);
      showMessage(`You and ${fromUsername} are now partners.`, true);
      setSearchResult(null);
      setSearchRequestStatus(null);
      await loadRequests();
      goToTierSelection(fromUid, fromUsername);
    } catch (error) {
      showMessage(getPartnerErrorMessage(error));
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleRemoveRequest = async (fromUid, toUid) => {
    setBusyRequestId(`${fromUid}_${toUid}`);
    showMessage('');

    try {
      await deletePartnerRequest(fromUid, toUid);
      if (searchResult && [fromUid, toUid].includes(searchResult.id)) setSearchRequestStatus(null);
      await loadRequests();
    } catch (error) {
      showMessage(getPartnerErrorMessage(error));
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleSendRequest = async () => {
    // If they already asked us, sending back simply accepts.
    if (searchRequestStatus === 'incoming') {
      await handleAccept(searchResult.id, searchResult.username);
      return;
    }

    setBusyRequestId(searchResult.id);
    showMessage('');

    try {
      await sendPartnerRequest(signedInUser.uid, searchResult);
      setSearchRequestStatus('outgoing');
      showMessage(
        `Request sent. Once ${searchResult.username} accepts on their account, you can play together.`,
        true,
      );
      await loadRequests();
    } catch (error) {
      showMessage(getPartnerErrorMessage(error));
    } finally {
      setBusyRequestId(null);
    }
  };

  const alreadyConnected = searchResult?.partnerIds.includes(signedInUser?.uid);
  const resultButtonTitle = (() => {
    if (alreadyConnected) return 'Partners';
    if (busyRequestId === searchResult?.id) return 'Sending...';
    if (searchRequestStatus === 'incoming') return 'Accept Request';
    if (searchRequestStatus === 'outgoing') return 'Request Sent';
    return 'Send Request';
  })();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>COOPERATIVE PLAY</Text>
      <Text style={styles.heading}>Find a Partner</Text>

      {incomingRequests.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Requests for you</Text>
          {incomingRequests.map((request) => (
            <Card key={request.id} style={styles.requestCard}>
              <View style={styles.requestRow}>
                <Avatar username={request.fromUsername} />
                <Text style={styles.resultUsername} numberOfLines={1}>{request.fromUsername}</Text>
              </View>
              <View style={styles.requestActions}>
                <View style={styles.requestAction}>
                  <PrimaryButton
                    title={busyRequestId === request.fromUid ? 'Accepting...' : 'Accept'}
                    onPress={() => handleAccept(request.fromUid, request.fromUsername)}
                    disabled={busyRequestId !== null}
                  />
                </View>
                <View style={styles.requestAction}>
                  <PrimaryButton
                    title="Decline"
                    variant="outline"
                    onPress={() => handleRemoveRequest(request.fromUid, request.toUid)}
                    disabled={busyRequestId !== null}
                  />
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      <Card style={styles.searchCard}>
        <Text style={styles.label}>Exact username</Text>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={(value) => {
            setUsername(value);
            showMessage('');
            setSearchResult(null);
            setSearchRequestStatus(null);
          }}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <PrimaryButton
          title={isSearching ? 'Searching...' : 'Search'}
          onPress={handleSearch}
          disabled={isSearching || busyRequestId !== null}
        />
      </Card>

      {searchResult ? (
        <Card style={styles.resultCard}>
          <Avatar username={searchResult.username} />
          <Text style={styles.resultUsername}>{searchResult.username}</Text>
          <PrimaryButton
            title={resultButtonTitle}
            onPress={handleSendRequest}
            disabled={
              alreadyConnected
              || searchRequestStatus === 'outgoing'
              || busyRequestId !== null
            }
          />
        </Card>
      ) : null}

      {message ? (
        <Text style={[styles.message, isSuccess && styles.successMessage]}>{message}</Text>
      ) : null}

      {outgoingRequests.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Sent requests</Text>
          {outgoingRequests.map((request) => (
            <Card key={request.id} style={styles.requestCard}>
              <View style={styles.requestRow}>
                <Avatar username={request.toUsername} />
                <View style={styles.resultDetails}>
                  <Text style={styles.resultUsername} numberOfLines={1}>{request.toUsername}</Text>
                  <Text style={styles.pendingText}>Waiting for them to accept</Text>
                </View>
              </View>
              <PrimaryButton
                title={busyRequestId === request.id ? 'Cancelling...' : 'Cancel Request'}
                variant="outline"
                onPress={() => handleRemoveRequest(request.fromUid, request.toUid)}
                disabled={busyRequestId !== null}
              />
            </Card>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.midnightNavy,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  eyebrow: {
    color: colors.neonCyan,
    fontFamily: typography.subheading,
    fontSize: 12,
  },
  heading: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 28,
  },
  section: {
    gap: 10,
  },
  sectionHeading: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 16,
  },
  searchCard: {
    gap: 12,
  },
  label: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 14,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.electricBlue,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.white,
    fontFamily: typography.body,
  },
  resultCard: {
    gap: 12,
  },
  requestCard: {
    gap: 12,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  requestAction: {
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.electricBlue,
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 20,
  },
  resultDetails: {
    flex: 1,
    gap: 2,
  },
  resultUsername: {
    flexShrink: 1,
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 18,
  },
  pendingText: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: typography.body,
    fontSize: 13,
  },
  message: {
    color: colors.error,
    fontFamily: typography.body,
    fontSize: 14,
    textAlign: 'center',
  },
  successMessage: {
    color: colors.neonCyan,
  },
});
