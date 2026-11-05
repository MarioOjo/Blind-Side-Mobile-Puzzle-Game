// Coordinates Firebase registration, Google sign-in, username reservation, rollback cleanup, login, logout, and account deletion.
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  arrayRemove,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { buildUserDocument, isValidUsername, normalizeUsername } from '../models/User';
import { auth, db } from './FirebaseConfig';
import { COLLECTIONS } from './FirestoreService';
import { requestGoogleIdToken, signOutOfGoogle } from './GoogleSignInService';

export async function loginUser(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function registerUser(username, email, password) {
  // Checked before the Auth account exists so a bad handle never needs a rollback.
  if (!isValidUsername(username)) {
    throw Object.assign(new Error('Username format is invalid.'), {
      code: 'auth/invalid-username',
    });
  }

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);

  try {
    await writeProfile(credential.user.uid, username);
    return credential.user;
  } catch (registrationError) {
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

// Reserves the username and creates the profile in one transaction. The rules reject the
// reservation when the username is taken, which surfaces here as permission-denied.
async function writeProfile(uid, username) {
  const normalizedUsername = normalizeUsername(username);

  try {
    await runTransaction(db, async (transaction) => {
      transaction.set(doc(db, COLLECTIONS.usernames, normalizedUsername), {
        uid,
        createdAt: serverTimestamp(),
      });
      transaction.set(doc(db, COLLECTIONS.users, uid), buildUserDocument({ uid, username }));
    });
  } catch (error) {
    throw error?.code === 'permission-denied'
      ? Object.assign(new Error('Username is already in use.'), {
          code: 'auth/username-already-in-use',
        })
      : error;
  }
}

// Returns the signed-in Firebase user, or null if the player closed the Google account picker.
// A first-time Google player has no profile yet; RootNavigator sends them to ChooseUsername.
export async function signInWithGoogle() {
  const idToken = await requestGoogleIdToken();
  if (!idToken) return null;

  const credential = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  return credential.user;
}

export async function hasUserProfile(uid) {
  const snapshot = await getDoc(doc(db, COLLECTIONS.users, uid));
  return snapshot.exists();
}

// Finishes setup for a signed-in player who has no profile yet (Google sign-in).
// Unlike registerUser, a taken username is not rolled back: the player just picks another.
export async function completeProfile(username) {
  const user = auth.currentUser;
  if (!user) {
    throw Object.assign(new Error('No signed-in user.'), { code: 'auth/no-current-user' });
  }
  if (!isValidUsername(username)) {
    throw Object.assign(new Error('Username format is invalid.'), {
      code: 'auth/invalid-username',
    });
  }

  await writeProfile(user.uid, username);
}

// Accounts created with email/password keep that sign-in method even if Google is linked later.
export function usesPasswordSignIn(user) {
  return (user?.providerData ?? []).some((provider) => provider.providerId === 'password');
}

export async function logoutUser() {
  await signOutOfGoogle();
  return signOut(auth);
}

export function sendPasswordReset(email) {
  return sendPasswordResetEmail(auth, email.trim());
}

// Permanently removes the signed-in player. Identity is re-checked first (password, or the
// Google account picker for Google-only players) because Firebase refuses to delete accounts
// without a recent sign-in, and failing at the final step would leave the profile half-deleted.
//
// Removed: profile, username reservation, solo sessions, partner requests, and this
// player's entry in every partner's list. Cooperative sessions are kept because they
// are shared history that also belongs to the partner.
export async function deleteAccount(password) {
  const user = auth.currentUser;
  if (!user) {
    throw Object.assign(new Error('No signed-in user.'), { code: 'auth/no-current-user' });
  }

  if (usesPasswordSignIn(user)) {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  } else {
    const idToken = await requestGoogleIdToken();
    if (!idToken) {
      throw Object.assign(new Error('Google confirmation was cancelled.'), {
        code: 'auth/google-cancelled',
      });
    }
    await reauthenticateWithCredential(user, GoogleAuthProvider.credential(idToken));
  }

  const { uid } = user;
  const profileRef = doc(db, COLLECTIONS.users, uid);
  const profileSnapshot = await getDoc(profileRef);
  const profile = profileSnapshot.exists() ? profileSnapshot.data() : null;

  const [soloSessions, outgoingRequests, incomingRequests] = await Promise.all([
    getDocs(query(
      collection(db, COLLECTIONS.sessions),
      where('mode', '==', 'solo'),
      where('userId', '==', uid),
    )),
    getDocs(query(collection(db, COLLECTIONS.partnerRequests), where('fromUid', '==', uid))),
    getDocs(query(collection(db, COLLECTIONS.partnerRequests), where('toUid', '==', uid))),
  ]);

  // Batches cap at 500 writes, so commit in chunks.
  const references = [
    ...soloSessions.docs.map((snapshot) => snapshot.ref),
    ...outgoingRequests.docs.map((snapshot) => snapshot.ref),
    ...incomingRequests.docs.map((snapshot) => snapshot.ref),
  ];
  for (let start = 0; start < references.length; start += 450) {
    const batch = writeBatch(db);
    references.slice(start, start + 450).forEach((reference) => batch.delete(reference));
    await batch.commit();
  }

  if (profile) {
    const finalBatch = writeBatch(db);
    (profile.partnerIds ?? []).forEach((partnerId) => {
      finalBatch.update(doc(db, COLLECTIONS.users, partnerId), {
        partnerIds: arrayRemove(uid),
      });
    });
    finalBatch.delete(doc(db, COLLECTIONS.usernames, profile.usernameLower));
    finalBatch.delete(profileRef);
    await finalBatch.commit();
  }

  await deleteUser(user);
  await signOutOfGoogle();
}

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account already exists for this email.',
  'auth/google-cancelled': 'Account deletion needs you to confirm with Google.',
  'auth/google-in-progress': 'Google sign-in is already open.',
  'auth/google-not-configured': "Google sign-in isn't set up for this version of the app.",
  'auth/google-play-services': 'Google sign-in needs Google Play services on this device.',
  'auth/invalid-credential': 'The email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/invalid-username': 'Usernames must be 3–20 characters: letters, numbers, underscores, or periods.',
  'auth/missing-password': 'Enter your password.',
  'auth/network-request-failed': 'Unable to connect. Check your internet connection and try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
  'auth/user-mismatch': 'Choose the same Google account you signed in with.',
  'auth/username-already-in-use': 'That username is already taken.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/wrong-password': 'That password is incorrect.',
};

export function getAuthErrorMessage(error) {
  return AUTH_ERROR_MESSAGES[error?.code] ?? 'Something went wrong. Please try again.';
}
