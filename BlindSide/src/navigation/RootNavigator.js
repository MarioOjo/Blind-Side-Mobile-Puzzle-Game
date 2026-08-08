import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import SplashScreen from '../screens/SplashScreen';
import { auth } from '../services/FirebaseConfig';

const SPLASH_FADE_OUT_DURATION = 375;

export default function RootNavigator() {
  const [currentUser, setCurrentUser] = useState(undefined);
  const [registrationInProgress, setRegistrationInProgress] = useState(false);
  // The splash sits on top of the nav tree until the intro animation finishes.
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => onAuthStateChanged(auth, setCurrentUser), []);

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
      {currentUser && !registrationInProgress ? (
        // MainTabs contains the signed-in game flow.
        <MainTabs />
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


