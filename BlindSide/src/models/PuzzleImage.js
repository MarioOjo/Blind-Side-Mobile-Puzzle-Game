// Validates and normalizes the Firestore document shape used for puzzle image metadata.
export function buildPuzzleImageDocument({
	imageId,
	imageName,
	category,
	imageURL,
	difficultyRecommended,
}) {
	if (!imageId || !imageName || !category || !imageURL || !difficultyRecommended) {
		throw new Error('Puzzle images require all schema fields.');
	}

	return { imageId, imageName, category, imageURL, difficultyRecommended };
}
