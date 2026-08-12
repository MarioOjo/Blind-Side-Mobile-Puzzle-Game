// Confirms the Firestore emulator contains exactly the document IDs declared by the seed manifest.
const { deleteApp, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { puzzleImages, questions } = require('./firestore-seed-manifest.cjs');

async function verifySeed() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Seed verification can run only against the Firestore emulator.');
  }

  const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-blindside' }, `seed-verify-${Date.now()}`);
  try {
    const firestore = getFirestore(app);
    const [imagesSnapshot, questionsSnapshot] = await Promise.all([
      firestore.collection('puzzleImages').get(),
      firestore.collection('questions').get(),
    ]);
    const imageIds = imagesSnapshot.docs.map((document) => document.id).sort();
    const questionIds = questionsSnapshot.docs.map((document) => document.id).sort();
    const expectedImageIds = puzzleImages.map(({ imageId }) => imageId).sort();
    const expectedQuestionIds = questions.map(({ questionId }) => questionId).sort();

    if (JSON.stringify(imageIds) !== JSON.stringify(expectedImageIds)) {
      throw new Error(`Unexpected puzzle image IDs: ${imageIds.join(', ')}`);
    }
    if (JSON.stringify(questionIds) !== JSON.stringify(expectedQuestionIds)) {
      throw new Error(`Unexpected question IDs: ${questionIds.join(', ')}`);
    }
    console.log(`[seed] Verified ${imageIds.length} puzzleImages and ${questionIds.length} questions.`);
  } finally {
    await deleteApp(app);
  }
}

verifySeed().catch((error) => {
  console.error(`[seed] ${error.message}`);
  process.exitCode = 1;
});
