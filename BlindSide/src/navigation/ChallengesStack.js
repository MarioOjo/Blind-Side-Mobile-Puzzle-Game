import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ExistingChallengesScreen from '../screens/ExistingChallengesScreen';
import ChallengeScreen from '../screens/ChallengeScreen';
import colors from '../theme/colors';
import typography from '../theme/typography';

const Stack = createNativeStackNavigator();

// Nested screen reached from Challenges for viewing/accepting an existing challenge (Coming Soon this sprint).
export default function ChallengesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.midnightNavy },
        headerTintColor: colors.neonCyan,
        headerTitleStyle: { fontFamily: typography.subheading },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="ExistingChallenges" component={ExistingChallengesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Challenge" component={ChallengeScreen} />
    </Stack.Navigator>
  );
}
