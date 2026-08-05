import { useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import SplashScreen from '../screens/SplashScreen';

const SPLASH_FADE_OUT_DURATION = 375;

export default function RootNavigator() {
  // Sprint 1 uses local state instead of real auth; this flips to true from the login/register actions.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // The splash sits on top of the nav tree until the intro animation finishes.
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

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
      {isAuthenticated ? (
        // MainTabs contains the signed-in game flow.
        <MainTabs />
      ) : (
        // AuthStack keeps the login/register flow isolated from the main app tabs.
        <AuthStack onAuthenticated={() => setIsAuthenticated(true)} />
      )}
      {showSplash && (
        // Absolute overlay lets the splash animate independently of the navigation state.
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: splashOpacity }]}>
          <SplashScreen onFinish={handleSplashFinish} />
        </Animated.View>
      )}
    </>
  );
}


