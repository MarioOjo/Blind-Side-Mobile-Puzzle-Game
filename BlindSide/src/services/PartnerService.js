import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';
import { normalizeUsername } from '../models/User';
import { db } from './FirebaseConfig';
import { COLLECTIONS } from './FirestoreService';

function partnerError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function searchUserByUsername(username, currentUid) {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    throw partnerError('partner/invalid-username', 'Enter a username to search.');
  }

  const snapshot = await getDocs(query(
    collection(db, COLLECTIONS.users),
    where('usernameLower', '==', normalizedUsername),
    limit(1),
  ));

  if (snapshot.empty) {
    return null;
  }

  const match = snapshot.docs[0];
  if (match.id === currentUid) {
    throw partnerError('partner/cannot-add-self', 'You cannot add yourself as a partner.');
  }

  return { id: match.id, ...match.data() };
}

export async function addPartner(currentUid, partnerUid) {
  if (!currentUid || !partnerUid || currentUid === partnerUid) {
    throw partnerError('partner/cannot-add-self', 'Choose another player as your partner.');
  }

  return runTransaction(db, async (transaction) => {
    const currentUserRef = doc(db, COLLECTIONS.users, currentUid);
    const partnerRef = doc(db, COLLECTIONS.users, partnerUid);
    const [currentUserSnapshot, partnerSnapshot] = await Promise.all([
      transaction.get(currentUserRef),
      transaction.get(partnerRef),
    ]);

    if (!currentUserSnapshot.exists() || !partnerSnapshot.exists()) {
      throw partnerError('partner/user-not-found', 'One of the player profiles no longer exists.');
    }

    const currentPartnerIds = currentUserSnapshot.data().partnerIds ?? [];
    const partnerPartnerIds = partnerSnapshot.data().partnerIds ?? [];
    const currentHasPartner = currentPartnerIds.includes(partnerUid);
    const partnerHasCurrent = partnerPartnerIds.includes(currentUid);

    if (currentHasPartner && partnerHasCurrent) {
      throw partnerError('partner/already-connected', 'You are already connected.');
    }

    if (currentHasPartner || partnerHasCurrent) {
      throw partnerError(
        'partner/inconsistent-connection',
        'This partnership needs support before it can be changed.',
      );
    }

    transaction.update(currentUserRef, {
      partnerIds: [...currentPartnerIds, partnerUid],
    });
    transaction.update(partnerRef, {
      partnerIds: [...partnerPartnerIds, currentUid],
    });

    return { currentUid, partnerUid };
  });
}