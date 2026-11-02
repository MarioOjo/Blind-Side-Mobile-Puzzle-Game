// Normalizes and validates usernames and builds the canonical user profile stored in Firestore.
import { serverTimestamp } from 'firebase/firestore';

// Mirrors validNewUsername in firestore.rules.
export const USERNAME_PATTERN = /^[A-Za-z0-9_.]{3,20}$/;
export const USERNAME_RULES_MESSAGE = 'Usernames must be 3–20 characters: letters, numbers, underscores, or periods.';

export function normalizeUsername(username) {
	return username.trim().toLowerCase();
}

export function isValidUsername(username) {
	return USERNAME_PATTERN.test(username.trim());
}

// Profiles are readable by every signed-in player (for partner search), so the
// email address deliberately stays in Firebase Auth and is never stored here.
export function buildUserDocument({ uid, username, profileImage = null }) {
	const normalizedUsername = normalizeUsername(username);

	if (!uid || !username.trim() || !normalizedUsername) {
		throw new Error('User documents require a uid and username.');
	}

	if (!isValidUsername(username)) {
		throw new Error(USERNAME_RULES_MESSAGE);
	}

	return {
		uid,
		username: username.trim(),
		usernameLower: normalizedUsername,
		profileImage,
		createdAt: serverTimestamp(),
		partnerIds: [],
	};
}
