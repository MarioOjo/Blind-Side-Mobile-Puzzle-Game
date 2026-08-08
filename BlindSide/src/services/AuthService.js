import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from './FirebaseConfig';

export async function loginUser(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function registerUser(email, password) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
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
  'auth/weak-password': 'Password must be at least 6 characters.',
};

export function getAuthErrorMessage(error) {
  return AUTH_ERROR_MESSAGES[error?.code] ?? 'Something went wrong. Please try again.';
}

