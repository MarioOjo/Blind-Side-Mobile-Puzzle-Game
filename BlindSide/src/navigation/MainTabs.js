import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeStack from './HomeStack';
import ChallengesStack from './ChallengesStack';
import ResultsScreen from '../screens/ResultsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import colors from '../theme/colors';

const Tab = createBottomTabNavigator();

// Filled/outline icon pairs keep the active tab easy to read at a glance.
const TAB_ICONS = {
  Home: ['home', 'home-outline'],
  Challenges: ['people', 'people-outline'],
  Results: ['trophy', 'trophy-outline'],
  Profile: ['person', 'person-outline'],
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      // Shared tab styling keeps the signed-in shell visually consistent.
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.neonCyan,
        tabBarInactiveTintColor: colors.white,
        tabBarStyle: { backgroundColor: colors.midnightNavy },
        tabBarIcon: ({ focused, color, size }) => {
          // Switch between the filled and outline icon based on tab focus state.
          const [filled, outline] = TAB_ICONS[route.name];
          return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
        },
      })}
    >
      {/* Home and Challenges use nested stacks so future detail screens can expand cleanly. */}
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Challenges" component={ChallengesStack} />
      {/* Results and Profile are direct screens for now because they are simple summaries. */}
      <Tab.Screen name="Results" component={ResultsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

