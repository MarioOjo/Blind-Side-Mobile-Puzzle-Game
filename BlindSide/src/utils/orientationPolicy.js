// Applies the platform-specific sensor policy that permits portrait and both landscape directions.
import { Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

const ANDROID_SCREEN_ORIENTATION_SENSOR = 4;

export async function applyGlobalOrientationPolicy() {
  if (Platform.OS === 'ios') {
    await ScreenOrientation.lockPlatformAsync({
      screenOrientationArrayIOS: [
        ScreenOrientation.Orientation.PORTRAIT_UP,
        ScreenOrientation.Orientation.LANDSCAPE_LEFT,
        ScreenOrientation.Orientation.LANDSCAPE_RIGHT,
      ],
    });
    return;
  }

  if (Platform.OS === 'android') {
    await ScreenOrientation.lockPlatformAsync({
      screenOrientationConstantAndroid: ANDROID_SCREEN_ORIENTATION_SENSOR,
    });
  }
}