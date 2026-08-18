// Verifies Firebase Auth chooses browser persistence on web and AsyncStorage on native.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { transformSync } = require('@babel/core');

function loadFirebaseConfig(platform) {
  const filename = path.join(__dirname, '..', 'src', 'services', 'FirebaseConfig.js');
  const source = fs.readFileSync(filename, 'utf8');
  const { code } = transformSync(source, {
    filename,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const app = { name: 'test-app' };
  const asyncStorage = { name: 'async-storage' };
  const browserPersistence = { name: 'browser-local' };
  const nativePersistence = { name: 'react-native' };
  const calls = { nativePersistence: [], initializeAuth: [] };
  const loadedModule = { exports: {} };
  const testRequire = (request) => {
    if (request === '@react-native-async-storage/async-storage') return asyncStorage;
    if (request === 'react-native') return { Platform: { OS: platform } };
    if (request === 'firebase/app') {
      return {
        getApp: () => app,
        getApps: () => [],
        initializeApp: () => app,
      };
    }
    if (request === 'firebase/auth') {
      return {
        browserLocalPersistence: browserPersistence,
        connectAuthEmulator: () => {},
        getAuth: () => ({ name: 'existing-auth' }),
        getReactNativePersistence: (storage) => {
          calls.nativePersistence.push(storage);
          return nativePersistence;
        },
        initializeAuth: (_app, options) => {
          calls.initializeAuth.push(options);
          return { name: 'initialized-auth' };
        },
      };
    }
    if (request === 'firebase/firestore') {
      return {
        connectFirestoreEmulator: () => {},
        getFirestore: () => ({ name: 'firestore' }),
      };
    }
    throw new Error(`Unexpected dependency: ${request}`);
  };
  const execute = new Function('require', 'module', 'exports', code);
  execute(testRequire, loadedModule, loadedModule.exports);

  return { asyncStorage, browserPersistence, calls, nativePersistence };
}

test('web auth uses browser persistence without calling the native factory', () => {
  const { browserPersistence, calls } = loadFirebaseConfig('web');

  assert.deepEqual(calls.nativePersistence, []);
  assert.equal(calls.initializeAuth[0].persistence, browserPersistence);
});

test('native auth retains AsyncStorage-backed persistence', () => {
  const { asyncStorage, calls, nativePersistence } = loadFirebaseConfig('android');

  assert.deepEqual(calls.nativePersistence, [asyncStorage]);
  assert.equal(calls.initializeAuth[0].persistence, nativePersistence);
});