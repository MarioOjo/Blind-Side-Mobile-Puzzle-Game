import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ExistingChallengesScreen from '../screens/ExistingChallengesScreen';
import ChallengeScreen from '../screens/ChallengeScreen';
import colors from '../theme/colors';
import typography from '../theme/typography';

const Stack = createNativeStackNavigator();

// Nested screen reached from Challenges for viewing or accepting an existing challenge.
export default function ChallengesStack() {
  return (
    // Keep the same header treatment as HomeStack so the app feels like one system.
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.midnightNavy },
        headerTintColor: colors.neonCyan,
        headerTitleStyle: { fontFamily: typography.subheading },
        headerShadowVisible: false,
      }}
    >
      {/* This is the first screen users see inside the Challenges tab. */}
      <Stack.Screen name="ExistingChallenges" component={ExistingChallengesScreen} options={{ headerShown: false }} />
      {/* Challenge detail is already routed here so future challenge actions can reuse the same screen. */}
      <Stack.Screen name="Challenge" component={ChallengeScreen} />
    </Stack.Navigator>
  );
}
