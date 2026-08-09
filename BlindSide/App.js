import { StatusBar } from 'expo-status-bar';
import { useFonts, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { Poppins_700Bold, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Inter_400Regular } from '@expo-google-fonts/inter';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  // Load the design-system fonts before rendering any screen so typography stays consistent.
  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
    Poppins_700Bold,
    Poppins_600SemiBold,
    Inter_400Regular,
  });

  // Keep the splash screen visible until the font set is ready.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* SafeAreaProvider keeps tab bars, headers, and the splash overlay inside device-safe bounds. */}
      <SafeAreaProvider>
        {/* NavigationContainer owns the full app navigation tree. */}
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}



