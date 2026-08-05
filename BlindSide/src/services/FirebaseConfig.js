import { initializeApp, getApps, getApp } from 'firebase/app';

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

export default firebaseApp;

