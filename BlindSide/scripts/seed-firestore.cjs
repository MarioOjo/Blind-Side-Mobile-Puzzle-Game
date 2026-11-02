// Validates seed content, mirrors puzzle art into Firebase Storage, and writes Firestore
// atomically to an emulator or an explicit production target.
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { applicationDefault, deleteApp, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
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
  if (puzzleImages.length !== 24 || questions.length !== 60) {
    throw new Error('Expected 24 puzzle images and 60 questions.');
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

  // 20 per tier keeps a full 48-piece cooperative puzzle (~15 questions) free of
  // repeats for every tier choice — see the cooperative.turn coverage test.
  if (Object.values(tierCounts).some((count) => count !== 20)) {
    throw new Error('Each question tier must contain exactly 20 questions.');
  }
}

const STORAGE_FOLDER = 'puzzleImages';

function getDownloadUrl(bucketName, filePath, token) {
  const origin = process.env.FIREBASE_STORAGE_EMULATOR_HOST
    ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`
    : 'https://firebasestorage.googleapis.com';
  return `${origin}/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
}

// The manifest's Unsplash URL is the source; players load our Storage copy so a photo
// removed from Unsplash can't break a puzzle. Files whose source is unchanged are reused,
// which keeps their download URLs stable across re-seeds.
async function mirrorPuzzleImage(bucket, image) {
  const file = bucket.file(`${STORAGE_FOLDER}/${image.imageId}.jpg`);
  const [exists] = await file.exists();
  if (exists) {
    const [{ metadata = {} }] = await file.getMetadata();
    const token = metadata.firebaseStorageDownloadTokens?.split(',')[0];
    if (token && metadata.sourceURL === image.imageURL) {
      return { url: getDownloadUrl(bucket.name, file.name, token), uploaded: false };
    }
  }

  const sourceUrl = new URL(image.imageURL);
  sourceUrl.searchParams.delete('auto');
  sourceUrl.searchParams.set('fm', 'jpg');
  const response = await fetch(sourceUrl);
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/jpeg')) {
    throw new Error(`Could not download ${image.imageId} from Unsplash (HTTP ${response.status}).`);
  }

  const token = randomUUID();
  await file.save(Buffer.from(await response.arrayBuffer()), {
    contentType: 'image/jpeg',
    metadata: {
      cacheControl: 'public, max-age=31536000',
      metadata: { firebaseStorageDownloadTokens: token, sourceURL: image.imageURL },
    },
  });
  return { url: getDownloadUrl(bucket.name, file.name, token), uploaded: true };
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

  // Production always mirrors images. Emulator runs mirror only when the Storage
  // emulator is configured; otherwise documents keep the Unsplash source URLs.
  const mirrorImages = options.production || Boolean(process.env.FIREBASE_STORAGE_EMULATOR_HOST);
  if (!options.production) {
    process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
    console.log(`[seed] Firestore emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
    console.log(mirrorImages
      ? `[seed] Storage emulator: ${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`
      : '[seed] Storage emulator not set; puzzle images keep their Unsplash URLs.');
  } else {
    console.warn('[seed] Production mode explicitly enabled; using Application Default Credentials.');
  }

  const credential = options.production ? applicationDefault() : null;
  if (credential) await credential.getAccessToken();

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
  const app = initializeApp({
    projectId,
    storageBucket,
    ...(credential ? { credential } : {}),
  }, `blindside-seed-${Date.now()}`);

  try {
    const documents = [...puzzleImages];
    if (mirrorImages) {
      const bucket = getStorage(app).bucket();
      // The Storage emulator creates buckets on first write, so only production is checked.
      const [bucketExists] = options.production ? await bucket.exists() : [true];
      if (!bucketExists) {
        throw new Error(`Storage bucket ${storageBucket} not found. Enable Storage in the Firebase console first.`);
      }
      let uploadedCount = 0;
      for (let index = 0; index < documents.length; index += 1) {
        const { url, uploaded } = await mirrorPuzzleImage(bucket, documents[index]);
        documents[index] = { ...documents[index], imageURL: url };
        if (uploaded) uploadedCount += 1;
      }
      console.log(`[seed] Storage: uploaded ${uploadedCount}, reused ${documents.length - uploadedCount} puzzle images.`);
    }

    const firestore = getFirestore(app);
    const batch = firestore.batch();
    for (const image of documents) {
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
