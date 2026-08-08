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
        buildUserDocument: ({ uid, username, email }) => ({ uid, username, email }),
      };
    }
    if (request === './FirebaseConfig') return { auth: 'auth', db: 'db' };
    if (request === './FirestoreService') {
      return { COLLECTIONS: { users: 'users', usernames: 'usernames' } };
    }
    return nodeRequire(request);
  };
  const execute = new Function('require', 'module', 'exports', '__filename', '__dirname', code);
  execute(testRequire, loadedModule, loadedModule.exports, filename, path.dirname(filename));
  return loadedModule.exports;
}

const { registerUser } = loadAuthService();

beforeEach(() => {
  events.length = 0;
  writes = [];
  commitError = null;
  cleanupError = null;
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