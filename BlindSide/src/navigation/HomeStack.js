import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeDashboardScreen from '../screens/HomeDashboardScreen';
import PuzzleScreen from '../screens/PuzzleScreen';
import ChallengeScreen from '../screens/ChallengeScreen';
import colors from '../theme/colors';
import typography from '../theme/typography';

const Stack = createNativeStackNavigator();

// Nested screens reached from Home for starting a new puzzle/challenge (Coming Soon this sprint).
export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.midnightNavy },
        headerTintColor: colors.neonCyan,
        headerTitleStyle: { fontFamily: typography.subheading },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="HomeDashboard" component={HomeDashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Puzzle" component={PuzzleScreen} />
      <Stack.Screen name="Challenge" component={ChallengeScreen} />
    </Stack.Navigator>
  );
}
