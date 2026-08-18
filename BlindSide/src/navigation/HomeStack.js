import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useWindowDimensions } from 'react-native';
import HomeDashboardScreen from '../screens/HomeDashboardScreen';
import DifficultySelectionScreen from '../screens/DifficultySelectionScreen';
import CategorySelectionScreen from '../screens/CategorySelectionScreen';
import PuzzleSelectionScreen from '../screens/PuzzleSelectionScreen';
import CooperativeTierSelectionScreen from '../screens/CooperativeTierSelectionScreen';
import CooperativeCategorySelectionScreen from '../screens/CooperativeCategorySelectionScreen';
import CooperativePuzzleSelectionScreen from '../screens/CooperativePuzzleSelectionScreen';
import CooperativeCompletionScreen from '../screens/CooperativeCompletionScreen';
import PuzzleScreen from '../screens/PuzzleScreen';
import SoloCompletionScreen from '../screens/SoloCompletionScreen';
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
      {/* Each selection step is pushed separately so Back returns to the immediately previous choice. */}
      <Stack.Screen
        name="DifficultySelection"
        component={DifficultySelectionScreen}
        options={{ title: 'Choose Difficulty' }}
      />
      <Stack.Screen
        name="CategorySelection"
        component={CategorySelectionScreen}
        options={{ title: 'Choose Category' }}
      />
      <Stack.Screen
        name="PuzzleSelection"
        component={PuzzleSelectionScreen}
        options={{ title: 'Choose Puzzle' }}
      />
      <Stack.Screen
        name="CooperativeTierSelection"
        component={CooperativeTierSelectionScreen}
        options={{ title: 'Choose Tier' }}
      />
      <Stack.Screen
        name="CooperativeCategorySelection"
        component={CooperativeCategorySelectionScreen}
        options={{ title: 'Choose Category' }}
      />
      <Stack.Screen
        name="CooperativePuzzleSelection"
        component={CooperativePuzzleSelectionScreen}
        options={{ title: 'Choose Puzzle' }}
      />
      <Stack.Screen name="Puzzle" component={PuzzleScreen} options={{ title: 'Gameplay' }} />
      <Stack.Screen
        name="SoloCompletion"
        component={SoloCompletionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CooperativeCompletion"
        component={CooperativeCompletionScreen}
        options={{ headerShown: false }}
      />
      {/* Placeholder detail screens remain available for the challenge flow. */}
      <Stack.Screen name="Challenge" component={ChallengeScreen} />
      <Stack.Screen
        name="PartnerConnection"
        component={PartnerConnectionScreen}
        options={{ title: 'Add Partner' }}
      />
    </Stack.Navigator>
  );
}
