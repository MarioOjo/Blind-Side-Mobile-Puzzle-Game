// Verifies registration ordering, username conflicts, rollback behavior, Google sign-in, and actionable errors.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { beforeEach, test } = require('node:test');
const { transformSync } = require('@babel/core');

const events = [];
const authUser = { uid: 'new-user-id', email: 'new@example.com' };
let commitError;
let cleanupError;
let writes;
let googleIdToken;
const authInstance = { currentUser: null };

const authMock = {
  createUserWithEmailAndPassword: async (_auth, email, password) => {
    events.push(['createAuth', email, password]);
    return { user: authUser };
  },
  deleteUser: async (user) => {
    events.push(['deleteAuth', user.uid]);
    if (cleanupError) throw cleanupError;
  },
  signInWithEmailAndPassword: async () => ({ user: authUser }),
  GoogleAuthProvider: {
    credential: (idToken) => ({ providerId: 'google.com', idToken }),
  },
  signInWithCredential: async (_auth, credential) => {
    events.push(['signInWithCredential', credential.idToken]);
    return { user: authUser };
  },
  signOut: async () => {
    events.push(['signOut']);
  },
};

const firestoreMock = {
  doc: (_db, collectionName, id) => `${collectionName}/${id}`,
  runTransaction: async (_db, operation) => {
    events.push(['createTransaction']);
    writes = [];
    await operation({
      set: (reference, data) => {
        events.push(['set', reference]);
        writes.push({ reference, data });
      },
    });
    events.push(['commit']);
    if (commitError) throw commitError;
  },
  serverTimestamp: () => 'server-timestamp',
};

function loadAuthService() {
  const filename = path.join(__dirname, '..', 'src', 'services', 'AuthService.js');
  const source = fs.readFileSync(filename, 'utf8');
  const { code } = transformSync(source, {
    filename,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const loadedModule = { exports: {} };
  const nodeRequire = createRequire(filename);
  const testRequire = (request) => {
    if (request === 'firebase/auth') return authMock;
    if (request === 'firebase/firestore') return firestoreMock;
    if (request === '../models/User') {
      return {
        normalizeUsername: (username) => username.trim().toLowerCase(),
        isValidUsername: (username) => /^[A-Za-z0-9_.]{3,20}$/.test(username.trim()),
        buildUserDocument: ({ uid, username }) => ({ uid, username }),
      };
    }
    if (request === './FirebaseConfig') return { auth: authInstance, db: 'db' };
    if (request === './GoogleSignInService') {
      return {
        requestGoogleIdToken: async () => {
          events.push(['googlePicker']);
          return googleIdToken;
        },
        signOutOfGoogle: async () => {
          events.push(['googleSignOut']);
        },
      };
    }
    if (request === './FirestoreService') {
      return { COLLECTIONS: { users: 'users', usernames: 'usernames' } };
    }
    return nodeRequire(request);
  };
  const execute = new Function('require', 'module', 'exports', '__filename', '__dirname', code);
  execute(testRequire, loadedModule, loadedModule.exports, filename, path.dirname(filename));
  return loadedModule.exports;
}

const {
  completeProfile,
  logoutUser,
  registerUser,
  signInWithGoogle,
  usesPasswordSignIn,
} = loadAuthService();

beforeEach(() => {
  events.length = 0;
  writes = [];
  commitError = null;
  cleanupError = null;
  googleIdToken = 'google-id-token';
  authInstance.currentUser = null;
});

test('registration creates Auth first, then atomically writes username and profile', async () => {
  const user = await registerUser('  Test  ', ' new@example.com ', 'password');

  assert.equal(user, authUser);
  assert.deepEqual(events.map(([event]) => event), [
    'createAuth', 'createTransaction', 'set', 'set', 'commit',
  ]);
  assert.deepEqual(writes.map(({ reference }) => reference), [
    'usernames/test', 'users/new-user-id',
  ]);
  assert.equal(writes[0].data.uid, 'new-user-id');
});

test('duplicate username denial rolls back Auth and returns username-taken error', async () => {
  commitError = Object.assign(new Error('Missing or insufficient permissions.'), {
    code: 'permission-denied',
  });

  await assert.rejects(
    registerUser('Test', 'new@example.com', 'password'),
    { code: 'auth/username-already-in-use', message: 'Username is already in use.' },
  );
  assert.deepEqual(events.map(([event]) => event), [
    'createAuth', 'createTransaction', 'set', 'set', 'commit', 'deleteAuth',
  ]);
});

test('rollback cleanup failure preserves the actionable registration error', async () => {
  commitError = Object.assign(new Error('Missing or insufficient permissions.'), {
    code: 'permission-denied',
  });
  cleanupError = new Error('cleanup failed');
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    await assert.rejects(
      registerUser('Test', 'new@example.com', 'password'),
      { code: 'auth/username-already-in-use' },
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.deepEqual(events.map(([event]) => event), [
    'createAuth', 'createTransaction', 'set', 'set', 'commit', 'deleteAuth', 'signOut',
  ]);
});

test('invalid usernames are rejected before any Auth account is created', async () => {
  await assert.rejects(
    registerUser('no spaces allowed', 'new@example.com', 'password'),
    { code: 'auth/invalid-username' },
  );
  assert.deepEqual(events, []);
});

test('Google sign-in exchanges the Google ID token for a Firebase credential', async () => {
  const user = await signInWithGoogle();

  assert.equal(user, authUser);
  assert.deepEqual(events, [['googlePicker'], ['signInWithCredential', 'google-id-token']]);
});

test('closing the Google account picker signs nobody in', async () => {
  googleIdToken = null;

  assert.equal(await signInWithGoogle(), null);
  assert.deepEqual(events, [['googlePicker']]);
});

test('completing a Google profile reserves the username without creating an Auth account', async () => {
  authInstance.currentUser = { uid: 'google-user-id' };

  await completeProfile('  Player.One ');

  assert.deepEqual(events.map(([event]) => event), ['createTransaction', 'set', 'set', 'commit']);
  assert.deepEqual(writes.map(({ reference }) => reference), [
    'usernames/player.one', 'users/google-user-id',
  ]);
});

test('a taken username during profile completion keeps the Google account signed in', async () => {
  authInstance.currentUser = { uid: 'google-user-id' };
  commitError = Object.assign(new Error('Missing or insufficient permissions.'), {
    code: 'permission-denied',
  });

  await assert.rejects(completeProfile('Taken'), { code: 'auth/username-already-in-use' });
  assert.ok(!events.some(([event]) => event === 'deleteAuth' || event === 'signOut'));
});

test('profile completion rejects invalid usernames before writing', async () => {
  authInstance.currentUser = { uid: 'google-user-id' };

  await assert.rejects(completeProfile('no spaces'), { code: 'auth/invalid-username' });
  assert.deepEqual(events, []);
});

test('password sign-in is detected from the provider list', () => {
  assert.equal(usesPasswordSignIn({ providerData: [{ providerId: 'password' }] }), true);
  assert.equal(usesPasswordSignIn({ providerData: [{ providerId: 'google.com' }] }), false);
  assert.equal(usesPasswordSignIn({
    providerData: [{ providerId: 'google.com' }, { providerId: 'password' }],
  }), true);
});

test('logging out clears the cached Google account before signing out of Firebase', async () => {
  await logoutUser();

  assert.deepEqual(events, [['googleSignOut'], ['signOut']]);
});
