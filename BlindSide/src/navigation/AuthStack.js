import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack({ onAuthenticated }) {
  return (
    // The auth stack stays headerless so the screens can own their entire layout.
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      {/* Login hands off to the root navigator once the user signs in. */}
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} onAuthenticated={onAuthenticated} />}
      </Stack.Screen>
      {/* Register uses the same simulated auth handoff for Sprint 1. */}
      <Stack.Screen name="Register">
        {(props) => <RegisterScreen {...props} onAuthenticated={onAuthenticated} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}


