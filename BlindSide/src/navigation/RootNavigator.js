import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import ChooseUsernameScreen from '../screens/ChooseUsernameScreen';
import SplashScreen from '../screens/SplashScreen';
import { hasUserProfile } from '../services/AuthService';
import { auth } from '../services/FirebaseConfig';
import colors from '../theme/colors';

const SPLASH_FADE_OUT_DURATION = 375;

export default function RootNavigator() {
  const [currentUser, setCurrentUser] = useState(undefined);
  const [registrationInProgress, setRegistrationInProgress] = useState(false);
  // 'checking' | 'ready' | 'missing'. Google players have no profile until they pick a username.
  const [profileStatus, setProfileStatus] = useState('checking');
  // The splash sits on top of the nav tree until the intro animation finishes.
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => onAuthStateChanged(auth, setCurrentUser), []);

  // Email registration writes the profile before registrationInProgress clears, so the check
  // waits for it; otherwise a new email account would briefly look profile-less.
  useEffect(() => {
    if (!currentUser || registrationInProgress) {
      setProfileStatus('checking');
      return undefined;
    }

    let isCancelled = false;
    hasUserProfile(currentUser.uid)
      .then((exists) => {
        if (!isCancelled) setProfileStatus(exists ? 'ready' : 'missing');
      })
      .catch(() => {
        // Offline or transient failure: let the player in; screens show their own load errors.
        if (!isCancelled) setProfileStatus('ready');
      });

    return () => {
      isCancelled = true;
    };
  }, [currentUser, registrationInProgress]);

  // Fade the splash away before showing whichever navigation stack is active.
  const handleSplashFinish = () => {
    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: SPLASH_FADE_OUT_DURATION,
      useNativeDriver: true,
    }).start(() => setShowSplash(false));
  };

  return (
    <>
      {currentUser && !registrationInProgress && profileStatus === 'ready' ? (
        // MainTabs contains the signed-in game flow.
        <MainTabs />
      ) : currentUser && !registrationInProgress && profileStatus === 'missing' ? (
        <ChooseUsernameScreen onComplete={() => setProfileStatus('ready')} />
      ) : currentUser && !registrationInProgress ? (
        // Brief navy hold while the profile check runs, so no screen flashes in between.
        <View style={styles.checking} />
      ) : currentUser === null || registrationInProgress ? (
        // AuthStack keeps the login/register flow isolated from the main app tabs.
        <AuthStack onRegistrationStateChange={setRegistrationInProgress} />
      ) : null}
      {showSplash && (
        // Absolute overlay lets the splash animate independently of the navigation state.
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: splashOpacity }]}>
          <SplashScreen onFinish={handleSplashFinish} />
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  checking: {
    flex: 1,
    backgroundColor: colors.midnightNavy,
  },
});
