// Centralizes typed Firestore collection reads, writes, and cooperative-session queries.
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { buildPuzzleImageDocument } from '../models/PuzzleImage';
import { buildQuestionDocument } from '../models/Question';
import { buildSessionDocument } from '../models/Session';
import { buildUserDocument } from '../models/User';
import { db } from './FirebaseConfig';

export const COLLECTIONS = {
  users: 'users',
  sessions: 'sessions',
  puzzleImages: 'puzzleImages',
  questions: 'questions',
  usernames: 'usernames',
};

async function readDocument(collectionName, id) {
  const snapshot = await getDoc(doc(db, collectionName, id));
  return snapshot.exists() ? snapshot.data() : null;
}

export function createUserProfile(input) {
  return setDoc(doc(db, COLLECTIONS.users, input.uid), buildUserDocument(input));
}

export function getUserProfile(uid) {
  return readDocument(COLLECTIONS.users, uid);
}

export async function getUserProfiles(uids) {
  const uniqueUids = [...new Set(uids.filter(Boolean))];
  const profiles = await Promise.all(uniqueUids.map(getUserProfile));
  return profiles.filter(Boolean);
}

export function createSession(sessionId, input) {
  return setDoc(doc(db, COLLECTIONS.sessions, sessionId), buildSessionDocument(input));
}

export function getSession(sessionId) {
  return readDocument(COLLECTIONS.sessions, sessionId);
}

export async function createCooperativeSession(input) {
  const reference = await addDoc(
    collection(db, COLLECTIONS.sessions),
    buildSessionDocument({
      ...input,
      mode: 'cooperative',
      status: 'inProgress',
    }),
  );
  return reference.id;
}

export function updateCooperativeSession(sessionId, patch) {
  return updateDoc(doc(db, COLLECTIONS.sessions, sessionId), patch);
}

export async function createSoloCompletion(input) {
  const reference = await addDoc(
    collection(db, COLLECTIONS.sessions),
    buildSessionDocument({
      ...input,
      mode: 'solo',
      status: 'completed',
      completedAt: serverTimestamp(),
    }),
  );
  return reference.id;
}

export async function createSoloSession(input) {
  const reference = await addDoc(
    collection(db, COLLECTIONS.sessions),
    buildSessionDocument({
      ...input,
      mode: 'solo',
      status: 'inProgress',
    }),
  );
  return reference.id;
}

export function updateSoloSession(sessionId, patch) {
  return updateDoc(doc(db, COLLECTIONS.sessions, sessionId), patch);
}

export async function getSoloSession(sessionId) {
  const snapshot = await getDoc(doc(db, COLLECTIONS.sessions, sessionId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getSoloSessions(uid) {
  const sessionsQuery = query(
    collection(db, COLLECTIONS.sessions),
    where('mode', '==', 'solo'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(sessionsQuery);
  return snapshot.docs.map((session) => ({ id: session.id, ...session.data() }));
}

export async function getSoloPersonalBest(uid, puzzleId) {
  const personalBestQuery = query(
    collection(db, COLLECTIONS.sessions),
    where('mode', '==', 'solo'),
    where('userId', '==', uid),
    where('puzzleId', '==', puzzleId),
    where('status', '==', 'completed'),
    orderBy('completionTime', 'asc'),
    limit(1),
  );
  const snapshot = await getDocs(personalBestQuery);
  if (snapshot.empty) return null;
  const session = snapshot.docs[0];
  return { id: session.id, ...session.data() };
}

export async function getCompletedSoloSessions(uid) {
  const completedSoloQuery = query(
    collection(db, COLLECTIONS.sessions),
    where('mode', '==', 'solo'),
    where('userId', '==', uid),
    where('status', '==', 'completed'),
  );
  const snapshot = await getDocs(completedSoloQuery);
  return snapshot.docs.map((session) => ({ id: session.id, ...session.data() }));
}

export async function getQuestionsForTier(tier) {
  const tierQuery = query(
    collection(db, COLLECTIONS.questions),
    where('tier', '==', tier),
  );
  const snapshot = await getDocs(tierQuery);
  return snapshot.docs.map((q) => ({ id: q.id, ...q.data() }));
}

export async function getCooperativeSessions(uid) {
  const sessionsQuery = query(
    collection(db, COLLECTIONS.sessions),
    where('mode', '==', 'cooperative'),
    where('partnerIds', 'array-contains', uid),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(sessionsQuery);
  return snapshot.docs.map((session) => ({ id: session.id, ...session.data() }));
}

export async function getCooperativeSession(sessionId) {
  const snapshot = await getDoc(doc(db, COLLECTIONS.sessions, sessionId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getCompletedCooperativeSessions(uid) {
  // Filters client-side: adding status to the Firestore query would require a new composite
  // index beyond the existing (mode, partnerIds, createdAt) one. Per-user result sets are
  // small enough that fetching all and filtering locally is fine.
  const sessions = await getCooperativeSessions(uid);
  return sessions.filter((session) => session.status === 'completed');
}

export function createPuzzleImage(input) {
  return setDoc(
    doc(db, COLLECTIONS.puzzleImages, input.imageId),
    buildPuzzleImageDocument(input),
  );
}

export function getPuzzleImage(imageId) {
  return readDocument(COLLECTIONS.puzzleImages, imageId);
}

export async function getPuzzleImages() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.puzzleImages));
  return snapshot.docs.flatMap((puzzle) => {
    try {
      return [buildPuzzleImageDocument({ ...puzzle.data(), imageId: puzzle.id })];
    } catch {
      return [];
    }
  });
}

export function createQuestion(input) {
  return setDoc(
    doc(db, COLLECTIONS.questions, input.questionId),
    buildQuestionDocument(input),
  );
}

export function getQuestion(questionId) {
  return readDocument(COLLECTIONS.questions, questionId);
}