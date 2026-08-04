import { initializeApp, getApps, getApp } from 'firebase/app';

// Keys are inlined from EXPO_PUBLIC_* vars in .env at build time — never hardcode real values here.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Guards against re-initializing the app on Fast Refresh.
const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export default firebaseApp;

