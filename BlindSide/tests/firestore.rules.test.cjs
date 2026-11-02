// Exercises Firestore authorization, schema rules, session access, partner requests, and account deletion.
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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} = require('firebase/firestore');

const projectId = 'demo-blindside';
let testEnvironment;
const firebaseConfigMock = { db: null, auth: { currentUser: null } };
const authEvents = [];
const authMock = {
  EmailAuthProvider: { credential: (email, password) => ({ email, password }) },
  reauthenticateWithCredential: async (user, credential) => {
    authEvents.push(['reauthenticate', user.uid, credential.password]);
    if (credential.password !== 'correct-password') {
      throw Object.assign(new Error('wrong password'), { code: 'auth/invalid-credential' });
    }
  },
  deleteUser: async (user) => { authEvents.push(['deleteUser', user.uid]); },
};

// Loads a service with its Firebase handles pointed at the rules-test environment.
function loadService(serviceFile) {
  const filename = path.join(__dirname, '..', 'src', 'services', serviceFile);
  const source = fs.readFileSync(filename, 'utf8');
  const { code } = transformSync(source, {
    filename,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const loadedModule = { exports: {} };
  const nodeRequire = createRequire(filename);
  const testRequire = (request) => {
    if (request === './FirebaseConfig') return firebaseConfigMock;
    if (request === 'firebase/auth') return authMock;
    if (request === './FirestoreService') {
      return {
        COLLECTIONS: {
          users: 'users',
          usernames: 'usernames',
          sessions: 'sessions',
          partnerRequests: 'partnerRequests',
        },
      };
    }
    if (request === '../models/User') {
      return {
        normalizeUsername: (username) => username.trim().toLowerCase(),
        isValidUsername: () => true,
        buildUserDocument: () => { throw new Error('not used in rules tests'); },
      };
    }
    return nodeRequire(request);
  };
  const execute = new Function('require', 'module', 'exports', '__filename', '__dirname', code);
  execute(testRequire, loadedModule, loadedModule.exports, filename, path.dirname(filename));
  return loadedModule.exports;
}

const {
  acceptPartnerRequest,
  deletePartnerRequest,
  getIncomingPartnerRequests,
  getOutgoingPartnerRequests,
  getPartnerRequestStatus,
  searchUserByUsername,
  sendPartnerRequest,
} = loadService('PartnerService.js');
const { deleteAccount } = loadService('AuthService.js');

// Fixed so full-document rewrites in update tests don't look like createdAt changes.
const CREATED_AT = Timestamp.fromMillis(1700000000000);

function userDocument(uid, username, overrides = {}) {
  return {
    uid,
    username,
    usernameLower: username.toLowerCase(),
    profileImage: null,
    createdAt: CREATED_AT,
    partnerIds: [],
    ...overrides,
  };
}

async function seed(documents) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    for (const [documentPath, data] of Object.entries(documents)) {
      await setDoc(doc(adminDb, documentPath), data);
    }
  });
}

const PARTNERED_USERS = {
  'users/alice-id': userDocument('alice-id', 'Alice', { partnerIds: ['bob-id'] }),
  'users/bob-id': userDocument('bob-id', 'Bob', { partnerIds: ['alice-id'] }),
};

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
    createdAt: CREATED_AT,
    placedPieceIds: [],
    ...overrides,
  };
}

function cooperativeSessionDocument(overrides = {}) {
  return {
    mode: 'cooperative',
    partnerIds: ['alice-id', 'bob-id'],
    puzzleId: 'puzzle-1',
    tier: 'friendship',
    status: 'inProgress',
    completionTime: null,
    completedAt: null,
    movesTaken: 0,
    createdAt: CREATED_AT,
    turnCount: 0,
    piecesPlacedTogether: 0,
    placedPieceIds: [],
    questionsAnswered: 0,
    questionsSkipped: 0,
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

  await seed(PARTNERED_USERS);
  await assertSucceeds(setDoc(doc(aliceDb, 'sessions/solo'), sessionDocument()));
  await assertFails(getDoc(doc(strangerDb, 'sessions/solo')));

  const cooperative = cooperativeSessionDocument();
  await assertSucceeds(setDoc(doc(bobDb, 'sessions/cooperative'), cooperative));
  await assertSucceeds(getDoc(doc(aliceDb, 'sessions/cooperative')));
  await assertFails(getDoc(doc(strangerDb, 'sessions/cooperative')));
});

test('participants can query cooperative sessions newest first', async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    for (const [id, createdAt] of [['older', 1000], ['newer', 2000]]) {
      await setDoc(doc(adminDb, `sessions/${id}`), cooperativeSessionDocument({
        piecesPlacedTogether: 4,
        questionsAnswered: 1,
        createdAt: Timestamp.fromMillis(createdAt),
      }));
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

test('partner search returns public profile fields only', async () => {
  await seed({
    'users/alice-id': userDocument('alice-id', 'Alice'),
    // A legacy profile that still stores an email must not leak it through search.
    'users/bob-id': userDocument('bob-id', 'Bob', { email: 'bob@example.com' }),
  });

  firebaseConfigMock.db = testEnvironment.authenticatedContext('alice-id').firestore();
  const result = await searchUserByUsername('  BOB  ', 'alice-id');
  assert.deepEqual(result, {
    id: 'bob-id',
    username: 'Bob',
    usernameLower: 'bob',
    profileImage: null,
    partnerIds: [],
  });
  assert.equal(await searchUserByUsername('Bobby', 'alice-id'), null);
  await assert.rejects(
    searchUserByUsername('ALICE', 'alice-id'),
    { code: 'partner/cannot-add-self' },
  );
});

test('partners connect only after the recipient accepts a request', async () => {
  await seed({
    'users/alice-id': userDocument('alice-id', 'Alice'),
    'users/bob-id': userDocument('bob-id', 'Bob'),
  });
  const aliceDb = testEnvironment.authenticatedContext('alice-id').firestore();
  const bobDb = testEnvironment.authenticatedContext('bob-id').firestore();

  firebaseConfigMock.db = aliceDb;
  await sendPartnerRequest('alice-id', { id: 'bob-id', username: 'Bob' });
  assert.equal(await getPartnerRequestStatus('alice-id', 'bob-id'), 'outgoing');
  assert.deepEqual((await getOutgoingPartnerRequests('alice-id')).map(({ id }) => id), ['alice-id_bob-id']);
  // Sending alone changes nobody's partner list.
  assert.deepEqual((await getDoc(doc(aliceDb, 'users/bob-id'))).data().partnerIds, []);
  // The sender cannot accept their own request, in the service or directly.
  await assert.rejects(acceptPartnerRequest('alice-id', 'bob-id'), { code: 'partner/request-not-found' });
  await assertFails(updateDoc(doc(aliceDb, 'users/bob-id'), { partnerIds: ['alice-id'] }));

  firebaseConfigMock.db = bobDb;
  assert.equal(await getPartnerRequestStatus('bob-id', 'alice-id'), 'incoming');
  const [incoming] = await getIncomingPartnerRequests('bob-id');
  assert.equal(incoming.fromUsername, 'Alice');
  await acceptPartnerRequest('bob-id', 'alice-id');

  assert.deepEqual((await getDoc(doc(bobDb, 'users/alice-id'))).data().partnerIds, ['bob-id']);
  assert.deepEqual((await getDoc(doc(bobDb, 'users/bob-id'))).data().partnerIds, ['alice-id']);
  assert.equal(await getPartnerRequestStatus('bob-id', 'alice-id'), null);

  firebaseConfigMock.db = aliceDb;
  await assert.rejects(
    sendPartnerRequest('alice-id', { id: 'bob-id', username: 'Bob' }),
    { code: 'partner/already-connected' },
  );
});

test('declined and cancelled requests are removed without connecting anyone', async () => {
  await seed({
    'users/alice-id': userDocument('alice-id', 'Alice'),
    'users/bob-id': userDocument('bob-id', 'Bob'),
    'users/carol-id': userDocument('carol-id', 'Carol'),
  });
  const aliceDb = testEnvironment.authenticatedContext('alice-id').firestore();
  firebaseConfigMock.db = aliceDb;
  await sendPartnerRequest('alice-id', { id: 'bob-id', username: 'Bob' });
  await sendPartnerRequest('alice-id', { id: 'carol-id', username: 'Carol' });

  await deletePartnerRequest('alice-id', 'bob-id');
  firebaseConfigMock.db = testEnvironment.authenticatedContext('carol-id').firestore();
  await deletePartnerRequest('alice-id', 'carol-id');

  // A bystander can't see or remove other people's requests.
  firebaseConfigMock.db = aliceDb;
  await sendPartnerRequest('alice-id', { id: 'bob-id', username: 'Bob' });
  const carolDb = testEnvironment.authenticatedContext('carol-id').firestore();
  await assertFails(getDoc(doc(carolDb, 'partnerRequests/alice-id_bob-id')));
  await assertFails(deleteDoc(doc(carolDb, 'partnerRequests/alice-id_bob-id')));

  assert.deepEqual((await getDoc(doc(aliceDb, 'users/alice-id'))).data().partnerIds, []);
});

test('partner lists cannot be changed without a matching request', async () => {
  await seed({
    'users/alice-id': userDocument('alice-id', 'Alice'),
    'users/bob-id': userDocument('bob-id', 'Bob'),
  });
  const strangerDb = testEnvironment.authenticatedContext('mallory-id').firestore();
  const aliceDb = testEnvironment.authenticatedContext('alice-id').firestore();

  // The pre-v1.1 rule let anyone append themselves to another profile.
  await assertFails(updateDoc(doc(strangerDb, 'users/alice-id'), { partnerIds: ['mallory-id'] }));
  // Owners can't add someone who never asked either.
  await assertFails(updateDoc(doc(aliceDb, 'users/alice-id'), { partnerIds: ['bob-id'] }));
  // Requests can't be forged on someone else's behalf or with a fake username.
  await assertFails(setDoc(doc(strangerDb, 'partnerRequests/bob-id_alice-id'), {
    fromUid: 'bob-id', toUid: 'alice-id', fromUsername: 'Bob', toUsername: 'Alice', createdAt: Timestamp.now(),
  }));
  await assertFails(setDoc(doc(aliceDb, 'partnerRequests/alice-id_bob-id'), {
    fromUid: 'alice-id', toUid: 'bob-id', fromUsername: 'NotAlice', toUsername: 'Bob', createdAt: Timestamp.now(),
  }));
});

test('new profiles never store an email and must use a valid username', async () => {
  const createProfile = (uid, profile) => {
    const db = testEnvironment.authenticatedContext(uid).firestore();
    return runTransaction(db, async (transaction) => {
      transaction.set(doc(db, `users/${uid}`), profile);
      transaction.set(doc(db, `usernames/${profile.usernameLower}`), { uid, createdAt: Timestamp.now() });
    });
  };

  await assertFails(createProfile('erin-id', userDocument('erin-id', 'Erin', { email: 'erin@example.com' })));
  await assertFails(createProfile('erin-id', userDocument('erin-id', 'no spaces')));
  await assertFails(createProfile('erin-id', userDocument('erin-id', 'ab')));
  await assertSucceeds(createProfile('erin-id', userDocument('erin-id', 'Erin_01')));
});

test('owners can remove a legacy email and legacy profiles stay updatable', async () => {
  await seed({ 'users/alice-id': userDocument('alice-id', 'Alice', { email: 'alice@example.com' }) });
  const aliceDb = testEnvironment.authenticatedContext('alice-id').firestore();
  const bobDb = testEnvironment.authenticatedContext('bob-id').firestore();
  const { deleteField } = require('firebase/firestore');

  await assertSucceeds(updateDoc(doc(aliceDb, 'users/alice-id'), { profileImage: 'https://example.com/a.png' }));
  await assertFails(updateDoc(doc(bobDb, 'users/alice-id'), { email: deleteField() }));
  await assertFails(updateDoc(doc(aliceDb, 'users/alice-id'), { email: 'new@example.com' }));
  await assertSucceeds(updateDoc(doc(aliceDb, 'users/alice-id'), { email: deleteField() }));
  assert.equal('email' in (await getDoc(doc(aliceDb, 'users/alice-id'))).data(), false);
});

test('cooperative sessions require an accepted partner and ownership cannot be reassigned', async () => {
  await seed({
    ...PARTNERED_USERS,
    'users/carol-id': userDocument('carol-id', 'Carol'),
  });
  const aliceDb = testEnvironment.authenticatedContext('alice-id').firestore();

  await assertFails(setDoc(
    doc(aliceDb, 'sessions/with-stranger'),
    cooperativeSessionDocument({ partnerIds: ['alice-id', 'carol-id'] }),
  ));
  await assertSucceeds(setDoc(doc(aliceDb, 'sessions/with-partner'), cooperativeSessionDocument()));

  await assertFails(updateDoc(doc(aliceDb, 'sessions/with-partner'), { partnerIds: ['alice-id', 'carol-id'] }));
  await assertFails(updateDoc(doc(aliceDb, 'sessions/with-partner'), { puzzleId: 'puzzle-2' }));
  await assertSucceeds(updateDoc(doc(aliceDb, 'sessions/with-partner'), { movesTaken: 7 }));

  await setDoc(doc(aliceDb, 'sessions/solo-run'), sessionDocument());
  await assertFails(updateDoc(doc(aliceDb, 'sessions/solo-run'), { userId: 'bob-id' }));
});

test('account deletion removes personal data and keeps shared cooperative history', async () => {
  await seed({
    ...PARTNERED_USERS,
    'users/carol-id': userDocument('carol-id', 'Carol'),
    'usernames/alice': { uid: 'alice-id', createdAt: CREATED_AT },
    'sessions/alice-solo': sessionDocument(),
    'sessions/bob-solo': sessionDocument({ userId: 'bob-id' }),
    'sessions/shared': cooperativeSessionDocument(),
    'partnerRequests/alice-id_carol-id': {
      fromUid: 'alice-id', toUid: 'carol-id', fromUsername: 'Alice', toUsername: 'Carol', createdAt: CREATED_AT,
    },
  });

  firebaseConfigMock.db = testEnvironment.authenticatedContext('alice-id').firestore();
  firebaseConfigMock.auth.currentUser = { uid: 'alice-id', email: 'alice@example.com' };
  authEvents.length = 0;

  await assert.rejects(deleteAccount('wrong-password'), { code: 'auth/invalid-credential' });
  assert.deepEqual(authEvents, [['reauthenticate', 'alice-id', 'wrong-password']]);

  await deleteAccount('correct-password');
  assert.deepEqual(authEvents.at(-1), ['deleteUser', 'alice-id']);

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    const exists = async (documentPath) => (await getDoc(doc(adminDb, documentPath))).exists();
    assert.equal(await exists('users/alice-id'), false);
    assert.equal(await exists('usernames/alice'), false);
    assert.equal(await exists('sessions/alice-solo'), false);
    assert.equal(await exists('partnerRequests/alice-id_carol-id'), false);
    assert.equal(await exists('sessions/bob-solo'), true);
    assert.equal(await exists('sessions/shared'), true);
    assert.deepEqual((await getDoc(doc(adminDb, 'users/bob-id'))).data().partnerIds, []);
  });
  firebaseConfigMock.auth.currentUser = null;
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

test('cooperative session checkpoint and completion updates are accepted for participants and rejected for strangers', async () => {
  const aliceDb = testEnvironment.authenticatedContext('alice-id').firestore();
  const strangerDb = testEnvironment.authenticatedContext('stranger-id').firestore();

  // Seed a valid cooperative session bypassing rules.
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'sessions/coop-active'), cooperativeSessionDocument());
  });

  const checkpoint = cooperativeSessionDocument({ piecesPlacedTogether: 6, questionsAnswered: 2, questionsSkipped: 1, turnCount: 6 });
  // A participant can update the session.
  await assertSucceeds(setDoc(doc(aliceDb, 'sessions/coop-active'), checkpoint));

  const completion = cooperativeSessionDocument({
    piecesPlacedTogether: 48,
    questionsAnswered: 14,
    questionsSkipped: 2,
    turnCount: 48,
    status: 'completed',
    completionTime: 185000,
    completedAt: Timestamp.now(),
  });
  await assertSucceeds(setDoc(doc(aliceDb, 'sessions/coop-active'), completion));

  // A stranger cannot update a session they are not part of.
  await assertFails(setDoc(doc(strangerDb, 'sessions/coop-active'), completion));
});

test('solo session checkpoint and completion updates are accepted for the owner and rejected for others', async () => {
  const aliceDb = testEnvironment.authenticatedContext('alice-id').firestore();
  const bobDb = testEnvironment.authenticatedContext('bob-id').firestore();

  // Seed a valid in-progress solo session bypassing rules.
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'sessions/solo-active'), sessionDocument());
  });

  const checkpoint = sessionDocument({ placedPieceIds: ['piece-0-0', 'piece-0-1'] });
  // The owner can update the session.
  await assertSucceeds(setDoc(doc(aliceDb, 'sessions/solo-active'), checkpoint));

  const completion = sessionDocument({
    placedPieceIds: ['piece-0-0', 'piece-0-1', 'piece-0-2'],
    status: 'completed',
    completionTime: 42000,
    completedAt: Timestamp.now(),
  });
  await assertSucceeds(setDoc(doc(aliceDb, 'sessions/solo-active'), completion));

  // Another user cannot update a solo session they don't own.
  await assertFails(setDoc(doc(bobDb, 'sessions/solo-active'), completion));
});

test('questions collection is readable by authenticated users and write-protected', async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'questions/q-friendship-1'), {
      questionId: 'q-friendship-1',
      tier: 'friendship',
      text: 'What made you laugh recently?',
    });
    await setDoc(doc(adminDb, 'questions/q-acquaintance-1'), {
      questionId: 'q-acquaintance-1',
      tier: 'acquaintance',
      text: 'What do you do for work?',
    });
  });

  const aliceDb = testEnvironment.authenticatedContext('alice-id').firestore();
  const publicDb = testEnvironment.unauthenticatedContext().firestore();

  // Authenticated user can read individual questions and query by tier.
  await assertSucceeds(getDoc(doc(aliceDb, 'questions/q-friendship-1')));
  const tierQuery = query(
    collection(aliceDb, 'questions'),
    where('tier', '==', 'friendship'),
  );
  const snapshot = await assertSucceeds(getDocs(tierQuery));
  assert.equal(snapshot.docs.length, 1);
  assert.equal(snapshot.docs[0].id, 'q-friendship-1');

  // Unauthenticated client cannot read questions.
  await assertFails(getDoc(doc(publicDb, 'questions/q-friendship-1')));

  // No client can write questions through the SDK.
  await assertFails(setDoc(doc(aliceDb, 'questions/q-new'), {
    questionId: 'q-new', tier: 'lover', text: 'A new question',
  }));
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