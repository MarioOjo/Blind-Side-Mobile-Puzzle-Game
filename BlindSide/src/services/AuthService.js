import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { buildUserDocument, normalizeUsername } from '../models/User';
import { auth, db } from './FirebaseConfig';
import { COLLECTIONS } from './FirestoreService';

export async function loginUser(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function registerUser(username, email, password) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const normalizedUsername = normalizeUsername(username);

  try {
    await runTransaction(db, async (transaction) => {
      transaction.set(doc(db, COLLECTIONS.usernames, normalizedUsername), {
        uid: credential.user.uid,
        createdAt: serverTimestamp(),
      });
      transaction.set(
        doc(db, COLLECTIONS.users, credential.user.uid),
        buildUserDocument({
          uid: credential.user.uid,
          username,
          email: credential.user.email,
        }),
      );
    });

    return credential.user;
  } catch (error) {
    const registrationError = error?.code === 'permission-denied'
      ? Object.assign(new Error('Username is already in use.'), {
          code: 'auth/username-already-in-use',
        })
      : error;

    try {
      await deleteUser(credential.user);
    } catch (cleanupError) {
      console.error('Unable to roll back Firebase Auth registration.', cleanupError);
      await signOut(auth).catch((signOutError) => {
        console.error('Unable to sign out after registration rollback failed.', signOutError);
      });
    }

    throw registrationError;
  }
}

export function logoutUser() {
  return signOut(auth);
}

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account already exists for this email.',
  'auth/invalid-credential': 'The email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/network-request-failed': 'Unable to connect. Check your internet connection and try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
  'auth/username-already-in-use': 'That username is already taken.',
  'auth/weak-password': 'Password must be at least 6 characters.',
};

export function getAuthErrorMessage(error) {
  return AUTH_ERROR_MESSAGES[error?.code] ?? 'Something went wrong. Please try again.';
}

