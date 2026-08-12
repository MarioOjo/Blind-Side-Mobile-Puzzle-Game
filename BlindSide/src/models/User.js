// Normalizes usernames and builds the canonical user profile stored in Firestore.
import { serverTimestamp } from 'firebase/firestore';

export function normalizeUsername(username) {
	return username.trim().toLowerCase();
}

export function buildUserDocument({ uid, username, email, profileImage = null }) {
	const normalizedUsername = normalizeUsername(username);

	if (!uid || !username.trim() || !normalizedUsername || !email.trim()) {
		throw new Error('User documents require a uid, username, and email.');
	}

	return {
		uid,
		username: username.trim(),
		usernameLower: normalizedUsername,
		email: email.trim().toLowerCase(),
		profileImage,
		createdAt: serverTimestamp(),
		partnerIds: [],
	};
}
