// Centralizes typed Firestore collection reads, writes, and cooperative-session queries.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
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

export function createPuzzleImage(input) {
  return setDoc(
    doc(db, COLLECTIONS.puzzleImages, input.imageId),
    buildPuzzleImageDocument(input),
  );
}

export function getPuzzleImage(imageId) {
  return readDocument(COLLECTIONS.puzzleImages, imageId);
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