// Searches normalized usernames and connects players through consent-based partner requests.
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
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

// Request IDs are deterministic so each direction can exist at most once.
export function getPartnerRequestId(fromUid, toUid) {
  return `${fromUid}_${toUid}`;
}

function partnerRequestRef(fromUid, toUid) {
  return doc(db, COLLECTIONS.partnerRequests, getPartnerRequestId(fromUid, toUid));
}

// Only public profile fields leave this service — never contact details.
function toPublicProfile(snapshot) {
  const { username, usernameLower, profileImage = null, partnerIds = [] } = snapshot.data();
  return {
    id: snapshot.id,
    username,
    usernameLower,
    profileImage,
    partnerIds,
  };
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

  return toPublicProfile(match);
}

// Returns 'incoming' | 'outgoing' | null for the pair, so the UI can show the right action.
export async function getPartnerRequestStatus(currentUid, otherUid) {
  const [outgoing, incoming] = await Promise.all([
    getDoc(partnerRequestRef(currentUid, otherUid)),
    getDoc(partnerRequestRef(otherUid, currentUid)),
  ]);
  if (incoming.exists()) return 'incoming';
  if (outgoing.exists()) return 'outgoing';
  return null;
}

export async function sendPartnerRequest(currentUid, partner) {
  if (!currentUid || !partner?.id || currentUid === partner.id) {
    throw partnerError('partner/cannot-add-self', 'Choose another player as your partner.');
  }

  const currentProfile = await getDoc(doc(db, COLLECTIONS.users, currentUid));
  if (!currentProfile.exists()) {
    throw partnerError('partner/user-not-found', 'One of the player profiles no longer exists.');
  }
  if ((currentProfile.data().partnerIds ?? []).includes(partner.id)) {
    throw partnerError('partner/already-connected', 'You are already connected.');
  }

  await setDoc(partnerRequestRef(currentUid, partner.id), {
    fromUid: currentUid,
    toUid: partner.id,
    fromUsername: currentProfile.data().username,
    toUsername: partner.username,
    createdAt: serverTimestamp(),
  });
}

async function getRequests(field, uid) {
  const snapshot = await getDocs(query(
    collection(db, COLLECTIONS.partnerRequests),
    where(field, '==', uid),
  ));
  return snapshot.docs
    .map((request) => ({ id: request.id, ...request.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

export function getIncomingPartnerRequests(uid) {
  return getRequests('toUid', uid);
}

export function getOutgoingPartnerRequests(uid) {
  return getRequests('fromUid', uid);
}

// The recipient accepts: both profiles gain each other and the request (plus any
// reverse request) is removed in one transaction.
export async function acceptPartnerRequest(currentUid, fromUid) {
  if (!currentUid || !fromUid || currentUid === fromUid) {
    throw partnerError('partner/cannot-add-self', 'Choose another player as your partner.');
  }

  return runTransaction(db, async (transaction) => {
    const requestRef = partnerRequestRef(fromUid, currentUid);
    const reverseRequestRef = partnerRequestRef(currentUid, fromUid);
    const currentUserRef = doc(db, COLLECTIONS.users, currentUid);
    const partnerRef = doc(db, COLLECTIONS.users, fromUid);
    const [requestSnapshot, reverseSnapshot, currentUserSnapshot, partnerSnapshot] = await Promise.all([
      transaction.get(requestRef),
      transaction.get(reverseRequestRef),
      transaction.get(currentUserRef),
      transaction.get(partnerRef),
    ]);

    if (!requestSnapshot.exists()) {
      throw partnerError('partner/request-not-found', 'That partner request is no longer available.');
    }

    if (!currentUserSnapshot.exists() || !partnerSnapshot.exists()) {
      throw partnerError('partner/user-not-found', 'One of the player profiles no longer exists.');
    }

    const currentPartnerIds = currentUserSnapshot.data().partnerIds ?? [];
    const partnerPartnerIds = partnerSnapshot.data().partnerIds ?? [];
    const currentHasPartner = currentPartnerIds.includes(fromUid);
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
      partnerIds: [...currentPartnerIds, fromUid],
    });
    transaction.update(partnerRef, {
      partnerIds: [...partnerPartnerIds, currentUid],
    });
    transaction.delete(requestRef);
    if (reverseSnapshot.exists()) transaction.delete(reverseRequestRef);

    return { currentUid, partnerUid: fromUid };
  });
}

// Declining (recipient) and cancelling (sender) both just remove the request.
export function deletePartnerRequest(fromUid, toUid) {
  return deleteDoc(partnerRequestRef(fromUid, toUid));
}
