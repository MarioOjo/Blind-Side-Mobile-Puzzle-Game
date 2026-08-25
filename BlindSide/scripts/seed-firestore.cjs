// Validates seed content and writes it atomically to an emulator or an explicit production target.
const fs = require('node:fs');
const path = require('node:path');
const { applicationDefault, deleteApp, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { puzzleImages, questions } = require('./firestore-seed-manifest.cjs');

function parseArguments(args) {
  const options = { dryRun: false, production: false, projectId: null };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--dry-run') options.dryRun = true;
    else if (argument === '--production') options.production = true;
    else if (argument === '--project') {
      options.projectId = args[index + 1];
      index += 1;
      if (!options.projectId || options.projectId.startsWith('--')) {
        throw new Error('--project requires a project ID.');
      }
    } else if (argument.startsWith('--project=')) {
      options.projectId = argument.slice('--project='.length);
      if (!options.projectId) throw new Error('--project requires a project ID.');
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

function getFirebaseRcProject() {
  const firebaseRcPath = path.join(__dirname, '..', '.firebaserc');
  if (!fs.existsSync(firebaseRcPath)) return null;
  return JSON.parse(fs.readFileSync(firebaseRcPath, 'utf8')).projects?.default ?? null;
}

function validateManifest() {
  if (puzzleImages.length !== 12 || questions.length !== 15) {
    throw new Error('Expected 12 puzzle images and 15 questions.');
  }

  const imageIds = new Set();
  const categories = new Set();
  const difficulties = new Set();
  const allowedCategories = new Set(['characters', 'people', 'places', 'textures']);
  const allowedDifficulties = new Set(['easy', 'medium', 'hard']);
  for (const image of puzzleImages) {
    const keys = Object.keys(image).sort();
    const expectedKeys = ['category', 'difficultyRecommended', 'imageId', 'imageName', 'imageURL'];
    if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
      throw new Error(`Puzzle ${image.imageId ?? '<unknown>'} has an invalid shape.`);
    }
    if (imageIds.has(image.imageId)) throw new Error(`Duplicate puzzle ID: ${image.imageId}`);
    if (!allowedCategories.has(image.category)) {
      throw new Error(`Puzzle ${image.imageId} has an unsupported category.`);
    }
    if (!allowedDifficulties.has(image.difficultyRecommended)) {
      throw new Error(`Puzzle ${image.imageId} has an unsupported difficulty.`);
    }
    // /photo- covers Unsplash's standard photographs; /vector- covers its free
    // (non-Unsplash+) illustration assets, used by the Characters category's
    // illustrated/non-photorealistic entries. Both are permanently accepted,
    // not scoped to a specific batch of images.
    const imageUrl = new URL(image.imageURL);
    const isDirectUnsplashUrl = imageUrl.protocol === 'https:'
      && imageUrl.hostname === 'images.unsplash.com'
      && /^\/(photo|vector)-[\w-]+$/.test(imageUrl.pathname);
    if (!isDirectUnsplashUrl) {
      throw new Error(`Puzzle ${image.imageId} must use a direct Unsplash HTTPS photo or vector URL.`);
    }
    imageIds.add(image.imageId);
    categories.add(image.category);
    difficulties.add(image.difficultyRecommended);
  }

  if (JSON.stringify([...categories].sort()) !== JSON.stringify([...allowedCategories].sort())) {
    throw new Error('Puzzle images must cover every supported category.');
  }
  if (JSON.stringify([...difficulties].sort()) !== JSON.stringify([...allowedDifficulties].sort())) {
    throw new Error('Puzzle images must cover every supported difficulty.');
  }

  const questionIds = new Set();
  const tierCounts = { acquaintance: 0, friendship: 0, lover: 0 };
  for (const question of questions) {
    const keys = Object.keys(question).sort();
    if (JSON.stringify(keys) !== JSON.stringify(['questionId', 'text', 'tier'])) {
      throw new Error(`Question ${question.questionId ?? '<unknown>'} has an invalid shape.`);
    }
    if (questionIds.has(question.questionId)) throw new Error(`Duplicate question ID: ${question.questionId}`);
    if (!(question.tier in tierCounts) || !question.text.trim()) {
      throw new Error(`Question ${question.questionId} has invalid content.`);
    }
    questionIds.add(question.questionId);
    tierCounts[question.tier] += 1;
  }

  if (Object.values(tierCounts).some((count) => count !== 5)) {
    throw new Error('Each question tier must contain exactly five questions.');
  }
}

async function seedFirestore() {
  const options = parseArguments(process.argv.slice(2));
  validateManifest();

  const environmentProject = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const projectId = options.projectId
    || environmentProject
    || (options.production ? getFirebaseRcProject() : 'demo-blindside');
  if (!projectId) throw new Error('A Firebase project ID is required.');

  const mode = options.production ? 'PRODUCTION' : 'EMULATOR';
  console.log(`[seed] ${mode} target: ${projectId}`);
  console.log(`[seed] Content: ${puzzleImages.length} puzzleImages / ${questions.length} questions`);
  if (options.dryRun) {
    console.log('[seed] Dry run complete; no Firebase connection or writes were made.');
    return;
  }

  if (!options.production) {
    process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
    console.log(`[seed] Firestore emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
  } else {
    console.warn('[seed] Production mode explicitly enabled; using Application Default Credentials.');
  }

  const credential = options.production ? applicationDefault() : null;
  if (credential) await credential.getAccessToken();

  const app = initializeApp({
    projectId,
    ...(credential ? { credential } : {}),
  }, `blindside-seed-${Date.now()}`);

  try {
    const firestore = getFirestore(app);
    const batch = firestore.batch();
    for (const image of puzzleImages) {
      batch.set(firestore.collection('puzzleImages').doc(image.imageId), image, { merge: false });
    }
    for (const question of questions) {
      batch.set(firestore.collection('questions').doc(question.questionId), question, { merge: false });
    }
    await batch.commit();
    console.log(`[seed] Wrote ${puzzleImages.length} puzzleImages and ${questions.length} questions.`);
  } finally {
    await deleteApp(app);
  }
}

seedFirestore().catch((error) => {
  console.error(`[seed] ${error.message}`);
  process.exitCode = 1;
});
