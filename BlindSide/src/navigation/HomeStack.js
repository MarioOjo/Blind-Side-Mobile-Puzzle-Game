import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useWindowDimensions } from 'react-native';
import HomeDashboardScreen from '../screens/HomeDashboardScreen';
import PuzzleScreen from '../screens/PuzzleScreen';
import ChallengeScreen from '../screens/ChallengeScreen';
import PartnerConnectionScreen from '../screens/PartnerConnectionScreen';
import colors from '../theme/colors';
import typography from '../theme/typography';

const Stack = createNativeStackNavigator();

// Nested screens reached from Home for starting a new puzzle or challenge flow.
export default function HomeStack() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  return (
    // Shared header styling keeps future nested screens visually aligned.
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.midnightNavy },
        headerTintColor: colors.neonCyan,
        headerTitleStyle: { fontFamily: typography.subheading },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: isLandscape ? 'minimal' : 'default',
      }}
    >
      {/* The dashboard is the entry point for the Home tab. */}
      <Stack.Screen name="HomeDashboard" component={HomeDashboardScreen} options={{ headerShown: false }} />
      {/* Placeholder detail screens are already wired so the tab flow can grow without rewiring navigation later. */}
      <Stack.Screen name="Puzzle" component={PuzzleScreen} />
      <Stack.Screen name="Challenge" component={ChallengeScreen} />
      <Stack.Screen
        name="PartnerConnection"
        component={PartnerConnectionScreen}
        options={{ title: 'Add Partner' }}
      />
    </Stack.Navigator>
  );
}
