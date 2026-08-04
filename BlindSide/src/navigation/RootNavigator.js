import { useState } from 'react';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

export default function RootNavigator() {
  // Sprint 1 uses local state instead of real auth — flips to true on Login/Register tap.
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return isAuthenticated ? (
    <MainTabs />
  ) : (
    <AuthStack onAuthenticated={() => setIsAuthenticated(true)} />
  );
}

