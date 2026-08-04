import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeDashboardScreen from '../screens/HomeDashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PuzzleScreen from '../screens/PuzzleScreen';
import ChallengeScreen from '../screens/ChallengeScreen';
import ResultsScreen from '../screens/ResultsScreen';
import ExistingChallengesScreen from '../screens/ExistingChallengesScreen';
import colors from '../theme/colors';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.neonCyan,
        tabBarInactiveTintColor: colors.white,
        tabBarStyle: { backgroundColor: colors.midnightNavy },
      }}
    >
      <Tab.Screen name="Home" component={HomeDashboardScreen} />
      <Tab.Screen name="Puzzle" component={PuzzleScreen} />
      <Tab.Screen name="Challenge" component={ChallengeScreen} />
      <Tab.Screen name="History" component={ExistingChallengesScreen} />
      <Tab.Screen name="Results" component={ResultsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

