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
const { doc, getDoc, setDoc, Timestamp, writeBatch } = require('firebase/firestore');

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
  const batch = writeBatch(db);
  batch.set(doc(db, 'users/alice-id'), userDocument('alice-id', 'Alice'));
  batch.set(doc(db, 'usernames/alice'), { uid: 'alice-id', createdAt: Timestamp.now() });
  await assertSucceeds(batch.commit());

  await assertFails(setDoc(doc(db, 'users/other-id'), userDocument('other-id', 'Other')));

  const duplicateDb = testEnvironment.authenticatedContext('duplicate-id').firestore();
  const duplicateBatch = writeBatch(duplicateDb);
  duplicateBatch.set(doc(duplicateDb, 'users/duplicate-id'), {
    ...userDocument('duplicate-id', 'ALICE'),
    usernameLower: 'alice',
  });
  duplicateBatch.set(
    doc(duplicateDb, 'usernames/alice'),
    { uid: 'duplicate-id', createdAt: Timestamp.now() },
  );
  await assertFails(duplicateBatch.commit());
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
  await assertSucceeds(setDoc(doc(bobDb, 'sessions/cooperative'), cooperative));
  await assertSucceeds(getDoc(doc(aliceDb, 'sessions/cooperative')));
  await assertFails(getDoc(doc(strangerDb, 'sessions/cooperative')));
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
  await assertSucceeds(getDoc(doc(aliceDb, 'questions/question-1')));
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