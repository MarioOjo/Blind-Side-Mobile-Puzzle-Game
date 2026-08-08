import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { auth } from '../services/FirebaseConfig';
import { addPartner, searchUserByUsername } from '../services/PartnerService';
import colors from '../theme/colors';
import typography from '../theme/typography';

const PARTNER_ERROR_MESSAGES = {
  'partner/cannot-add-self': 'You cannot add yourself as a partner.',
  'partner/invalid-username': 'Enter a username to search.',
  'partner/user-not-found': 'That player profile is no longer available.',
  'partner/already-connected': 'You are already connected with this player.',
  'partner/inconsistent-connection': 'This partnership needs support before it can be changed.',
};

function getPartnerErrorMessage(error) {
  return PARTNER_ERROR_MESSAGES[error?.code] ?? 'Unable to connect right now. Please try again.';
}

export default function PartnerConnectionScreen({ currentUser } = {}) {
  const signedInUser = currentUser === undefined ? auth.currentUser : currentUser;
  const [username, setUsername] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [message, setMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleSearch = async () => {
    if (!signedInUser) {
      setMessage('Sign in before searching for a partner.');
      return;
    }

    setSearchResult(null);
    setMessage('');
    setIsConnected(false);
    setIsSearching(true);

    try {
      const result = await searchUserByUsername(username, signedInUser.uid);
      if (!result) {
        setMessage('No player found with that exact username.');
      } else {
        setSearchResult(result);
        if (result.partnerIds?.includes(signedInUser.uid)) {
          setMessage('You are already connected with this player.');
        }
      }
    } catch (error) {
      setMessage(getPartnerErrorMessage(error));
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddPartner = async () => {
    setMessage('');
    setIsConnecting(true);

    try {
      await addPartner(signedInUser.uid, searchResult.id);
      setIsConnected(true);
      setMessage(`You and ${searchResult.username} are now partners.`);
    } catch (error) {
      setMessage(getPartnerErrorMessage(error));
    } finally {
      setIsConnecting(false);
    }
  };

  const alreadyConnected = searchResult?.partnerIds?.includes(signedInUser?.uid);

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>COOPERATIVE PLAY</Text>
      <Text style={styles.heading}>Find a Partner</Text>

      <Card style={styles.searchCard}>
        <Text style={styles.label}>Exact username</Text>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="rgba(255,255,255,0.5)"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={(value) => {
            setUsername(value);
            setMessage('');
            setSearchResult(null);
            setIsConnected(false);
          }}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <PrimaryButton
          title={isSearching ? 'Searching...' : 'Search'}
          onPress={handleSearch}
          disabled={isSearching || isConnecting}
        />
      </Card>

      {searchResult ? (
        <Card style={styles.resultCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{searchResult.username.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.resultDetails}>
            <Text style={styles.resultUsername}>{searchResult.username}</Text>
            <Text style={styles.resultEmail}>{searchResult.email}</Text>
          </View>
          <PrimaryButton
            title={isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Add Partner'}
            onPress={handleAddPartner}
            disabled={isConnected || isConnecting || alreadyConnected}
          />
        </Card>
      ) : null}

      {message ? (
        <Text style={[styles.message, isConnected && styles.successMessage]}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnightNavy,
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
    gap: 2,
  },
  resultUsername: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 18,
  },
  resultEmail: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: typography.body,
    fontSize: 13,
  },
  message: {
    color: '#FCA5A5',
    fontFamily: typography.body,
    fontSize: 14,
    textAlign: 'center',
  },
  successMessage: {
    color: colors.neonCyan,
  },
});