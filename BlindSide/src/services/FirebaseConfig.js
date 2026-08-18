import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

// Environment variables are injected at build time; real Firebase values should never be hardcoded.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Reuse the existing app instance during Fast Refresh instead of creating duplicates.
const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth;

try {
  auth = initializeAuth(firebaseApp, {
    // Web uses the browser SDK's persistence; native retains AsyncStorage-backed sessions.
    persistence: Platform.OS === 'web'
      ? browserLocalPersistence
      : getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  if (error.code !== 'auth/already-initialized') {
    throw error;
  }

  auth = getAuth(firebaseApp);
}

const db = getFirestore(firebaseApp);

if (
  process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true'
  && !globalThis.__blindSideFirebaseEmulatorsConnected
) {
  const emulatorHost = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
  globalThis.__blindSideFirebaseEmulatorsConnected = true;
}

export { auth, db };
export default firebaseApp;

