// Exercises Firestore authorization, schema rules, session access, and partner transactions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { after, before, beforeEach, test } = require('node:test');
const { transformSync } = require('@babel/core');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  where,
} = require('firebase/firestore');

const projectId = 'demo-blindside';
let testEnvironment;
const firebaseConfigMock = { db: null };

function loadPartnerService() {
  const filename = path.join(__dirname, '..', 'src', 'services', 'PartnerService.js');
  const source = fs.readFileSync(filename, 'utf8');
  const { code } = transformSync(source, {
    filename,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const loadedModule = { exports: {} };
  const nodeRequire = createRequire(filename);
  const testRequire = (request) => {
    if (request === './FirebaseConfig') return firebaseConfigMock;
    if (request === './FirestoreService') {
      return { COLLECTIONS: { users: 'users' } };
    }
    if (request === '../models/User') {
      return { normalizeUsername: (username) => username.trim().toLowerCase() };
    }
    return nodeRequire(request);
  };
  const execute = new Function('require', 'module', 'exports', '__filename', '__dirname', code);
  execute(testRequire, loadedModule, loadedModule.exports, filename, path.dirname(filename));
  return loadedModule.exports;
}

const { addPartner, searchUserByUsername } = loadPartnerService();

function userDocument(uid, username) {
  return {
    uid,
    username,
    usernameLower: username.toLowerCase(),
    email: `${username.toLowerCase()}@example.com`,
    profileImage: null,
    createdAt: Timestamp.now(),
    partnerIds: [],
  };
}

function sessionDocument(overrides = {}) {
  return {
    mode: 'solo',
    userId: 'alice-id',
    puzzleId: 'puzzle-1',
    difficulty: 'easy',
    category: 'places',
    status: 'inProgress',
    completionTime: null,
    completedAt: null,
    movesTaken: 0,
    createdAt: Timestamp.now(),
    ...overrides,
  };
}

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8'),
    },
  });
});

beforeEach(() => testEnvironment.clearFirestore());
after(() => testEnvironment.cleanup());

test('user profile and username reservation must be created atomically', async () => {
  const db = testEnvironment.authenticatedContext('alice-id').firestore();
  await assertSucceeds(runTransaction(db, async (transaction) => {
    transaction.set(doc(db, 'users/alice-id'), userDocument('alice-id', 'Alice'));
    transaction.set(
      doc(db, 'usernames/alice'),
      { uid: 'alice-id', createdAt: Timestamp.now() },
    );
  }));

  await assertFails(setDoc(doc(db, 'users/other-id'), userDocument('other-id', 'Other')));

  const duplicateDb = testEnvironment.authenticatedContext('duplicate-id').firestore();
  await assertFails(runTransaction(duplicateDb, async (transaction) => {
    transaction.set(doc(duplicateDb, 'users/duplicate-id'), {
      ...userDocument('duplicate-id', 'ALICE'),
      usernameLower: 'alice',
    });
    transaction.set(
      doc(duplicateDb, 'usernames/alice'),
      { uid: 'duplicate-id', createdAt: Timestamp.now() },
    );
  }));
});

test('unauthenticated clients cannot read or reserve usernames', async () => {
  const publicDb = testEnvironment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(publicDb, 'usernames/test')));
  await assertFails(setDoc(doc(publicDb, 'usernames/test'), {
    uid: 'anonymous-id',
    createdAt: Timestamp.now(),
  }));
});

test('only session participants can create and read sessions', async () => {
  const aliceDb = testEnvironment.authenticatedContext('alice-id').firestore();
  const bobDb = testEnvironment.authenticatedContext('bob-id').firestore();
  const strangerDb = testEnvironment.authenticatedContext('stranger-id').firestore();

  await assertSucceeds(setDoc(doc(aliceDb, 'sessions/solo'), sessionDocument()));
  await assertFails(getDoc(doc(strangerDb, 'sessions/solo')));

  const cooperative = sessionDocument({
    mode: 'cooperative',
    partnerIds: ['alice-id', 'bob-id'],
    piecesPlacedTogether: 0,
    questionsAnswered: 0,
  });
  delete cooperative.userId;
  delete cooperative.difficulty;
  delete cooperative.category;
  await assertSucceeds(setDoc(doc(bobDb, 'sessions/cooperative'), cooperative));
  await assertSucceeds(getDoc(doc(aliceDb, 'sessions/cooperative')));
  await assertFails(getDoc(doc(strangerDb, 'sessions/cooperative')));
});

test('participants can query cooperative sessions newest first', async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    for (const [id, createdAt] of [['older', 1000], ['newer', 2000]]) {
      const cooperative = sessionDocument({
        mode: 'cooperative',
        partnerIds: ['alice-id', 'bob-id'],
        piecesPlacedTogether: 4,
        questionsAnswered: 1,
        createdAt: Timestamp.fromMillis(createdAt),
      });
      delete cooperative.userId;
      delete cooperative.difficulty;
      delete cooperative.category;
      await setDoc(doc(adminDb, `sessions/${id}`), cooperative);
    }
  });

  const aliceDb = testEnvironment.authenticatedContext('alice-id').firestore();
  const sessionsQuery = query(
    collection(aliceDb, 'sessions'),
    where('mode', '==', 'cooperative'),
    where('partnerIds', 'array-contains', 'alice-id'),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await assertSucceeds(getDocs(sessionsQuery));
  assert.deepEqual(snapshot.docs.map((session) => session.id), ['newer', 'older']);
});

test('invalid session ownership and unauthenticated access are rejected', async () => {
  const aliceDb = testEnvironment.authenticatedContext('alice-id').firestore();
  const publicDb = testEnvironment.unauthenticatedContext().firestore();

  await assertFails(setDoc(
    doc(aliceDb, 'sessions/invalid'),
    sessionDocument({ mode: 'cooperative', partnerIds: ['alice-id', 'alice-id'] }),
  ));
  await assertFails(getDoc(doc(publicDb, 'sessions/invalid')));
});

test('puzzle images and questions are authenticated read-only content', async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'puzzleImages/puzzle-1'), {
      imageId: 'puzzle-1',
      imageName: 'City Lights',
      category: 'city',
      imageURL: 'https://example.com/puzzle.jpg',
      difficultyRecommended: 'medium',
    });
    await setDoc(doc(adminDb, 'questions/question-1'), {
      questionId: 'question-1',
      tier: 'friendship',
      text: 'What made you laugh recently?',
    });
  });

  const aliceDb = testEnvironment.authenticatedContext('alice-id').firestore();
  await assertSucceeds(getDoc(doc(aliceDb, 'puzzleImages/puzzle-1')));
  const puzzleCatalog = await assertSucceeds(getDocs(collection(aliceDb, 'puzzleImages')));
  assert.deepEqual(puzzleCatalog.docs.map((puzzle) => puzzle.id), ['puzzle-1']);
  await assertSucceeds(getDoc(doc(aliceDb, 'questions/question-1')));
  const publicDb = testEnvironment.unauthenticatedContext().firestore();
  await assertFails(getDocs(collection(publicDb, 'puzzleImages')));
  await assertFails(setDoc(doc(aliceDb, 'questions/question-2'), {
    questionId: 'question-2', tier: 'lover', text: 'A question',
  }));
});

test('partner service searches exactly and connects both users atomically', async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'users/alice-id'), userDocument('alice-id', 'Alice'));
    await setDoc(doc(adminDb, 'users/bob-id'), userDocument('bob-id', 'Bob'));
  });

  firebaseConfigMock.db = testEnvironment.authenticatedContext('alice-id').firestore();
  const result = await searchUserByUsername('  BOB  ', 'alice-id');
  assert.equal(result.id, 'bob-id');
  assert.equal(await searchUserByUsername('Bobby', 'alice-id'), null);
  await assert.rejects(
    searchUserByUsername('ALICE', 'alice-id'),
    { code: 'partner/cannot-add-self' },
  );

  await addPartner('alice-id', 'bob-id');
  const alice = await getDoc(doc(firebaseConfigMock.db, 'users/alice-id'));
  const bob = await getDoc(doc(firebaseConfigMock.db, 'users/bob-id'));
  assert.deepEqual(alice.data().partnerIds, ['bob-id']);
  assert.deepEqual(bob.data().partnerIds, ['alice-id']);

  await assert.rejects(
    addPartner('alice-id', 'bob-id'),
    { code: 'partner/already-connected' },
  );
  assert.deepEqual((await getDoc(doc(firebaseConfigMock.db, 'users/alice-id'))).data().partnerIds, ['bob-id']);
});

test('partner service rejects self and missing-user connections', async () => {
  firebaseConfigMock.db = testEnvironment.authenticatedContext('alice-id').firestore();
  await assert.rejects(addPartner('alice-id', 'alice-id'), { code: 'partner/cannot-add-self' });
  await assert.rejects(addPartner('alice-id', 'missing-id'), { code: 'partner/user-not-found' });
});

test('solo completions require scoped metadata and expose only the owner personal best', async () => {
  const aliceDb = testEnvironment.authenticatedContext('alice-id').firestore();
  const bobDb = testEnvironment.authenticatedContext('bob-id').firestore();

  await assertSucceeds(setDoc(
    doc(aliceDb, 'sessions/alice-slower'),
    sessionDocument({
      status: 'completed',
      completionTime: 42000,
      completedAt: Timestamp.now(),
    }),
  ));
  await assertSucceeds(setDoc(
    doc(aliceDb, 'sessions/alice-faster'),
    sessionDocument({
      status: 'completed',
      completionTime: 39000,
      completedAt: Timestamp.now(),
    }),
  ));
  await assertFails(setDoc(doc(aliceDb, 'sessions/missing-metadata'), {
    ...sessionDocument(),
    difficulty: null,
  }));
  await assertFails(getDoc(doc(bobDb, 'sessions/alice-faster')));

  const personalBestQuery = query(
    collection(aliceDb, 'sessions'),
    where('mode', '==', 'solo'),
    where('userId', '==', 'alice-id'),
    where('puzzleId', '==', 'puzzle-1'),
    where('status', '==', 'completed'),
    orderBy('completionTime', 'asc'),
  );
  const personalBest = await assertSucceeds(getDocs(personalBestQuery));
  assert.equal(personalBest.docs[0].id, 'alice-faster');
});

test('completed solo history query is owner-scoped and excludes unfinished runs', async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await Promise.all([
      setDoc(doc(adminDb, 'sessions/alice-complete'), sessionDocument({
        status: 'completed', completionTime: 35000, completedAt: Timestamp.now(),
      })),
      setDoc(doc(adminDb, 'sessions/alice-progress'), sessionDocument({ status: 'inProgress' })),
      setDoc(doc(adminDb, 'sessions/bob-complete'), sessionDocument({
        userId: 'bob-id', status: 'completed', completionTime: 20000, completedAt: Timestamp.now(),
      })),
    ]);
  });

  const aliceDb = testEnvironment.authenticatedContext('alice-id').firestore();
  const historyQuery = query(
    collection(aliceDb, 'sessions'),
    where('mode', '==', 'solo'),
    where('userId', '==', 'alice-id'),
    where('status', '==', 'completed'),
  );
  const history = await assertSucceeds(getDocs(historyQuery));
  assert.deepEqual(history.docs.map(({ id }) => id), ['alice-complete']);

  const bobHistoryQuery = query(
    collection(aliceDb, 'sessions'),
    where('mode', '==', 'solo'),
    where('userId', '==', 'bob-id'),
    where('status', '==', 'completed'),
  );
  await assertFails(getDocs(bobHistoryQuery));
});