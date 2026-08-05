import { useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import SplashScreen from '../screens/SplashScreen';

const SPLASH_FADE_OUT_DURATION = 250;

export default function RootNavigator() {
  // Sprint 1 uses local state instead of real auth — flips to true on Login/Register tap.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

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
        <MainTabs />
      ) : (
        <AuthStack onAuthenticated={() => setIsAuthenticated(true)} />
      )}
      {showSplash && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: splashOpacity }]}>
          <SplashScreen onFinish={handleSplashFinish} />
        </Animated.View>
      )}
    </>
  );
}


