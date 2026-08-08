import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack({ onRegistrationStateChange }) {
  return (
    // The auth stack stays headerless so the screens can own their entire layout.
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register">
        {(props) => (
          <RegisterScreen
            {...props}
            onRegistrationStateChange={onRegistrationStateChange}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}


