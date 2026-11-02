// One-off v1.1 privacy migration: strips the legacy `email` field from every user profile.
// Defaults to the emulator; pass --production to target the real project (uses
// Application Default Credentials) and --dry-run to only count affected profiles.
const fs = require('node:fs');
const path = require('node:path');
const { applicationDefault, deleteApp, initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

function parseArguments(args) {
  const options = { dryRun: false, production: false };
  for (const argument of args) {
    if (argument === '--dry-run') options.dryRun = true;
    else if (argument === '--production') options.production = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function getFirebaseRcProject() {
  const firebaseRcPath = path.join(__dirname, '..', '.firebaserc');
  if (!fs.existsSync(firebaseRcPath)) return null;
  return JSON.parse(fs.readFileSync(firebaseRcPath, 'utf8')).projects?.default ?? null;
}

async function removeProfileEmails() {
  const options = parseArguments(process.argv.slice(2));
  const projectId = options.production ? getFirebaseRcProject() : 'demo-blindside';
  if (!projectId) throw new Error('No default project found in .firebaserc.');

  console.log(`[migrate] ${options.production ? 'PRODUCTION' : 'EMULATOR'} target: ${projectId}`);
  if (!options.production) process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';

  const credential = options.production ? applicationDefault() : null;
  const app = initializeApp({
    projectId,
    ...(credential ? { credential } : {}),
  }, `blindside-migrate-${Date.now()}`);

  try {
    const firestore = getFirestore(app);
    const users = await firestore.collection('users').get();
    const withEmail = users.docs.filter((user) => user.get('email') !== undefined);
    console.log(`[migrate] ${withEmail.length} of ${users.size} profiles still store an email.`);

    if (options.dryRun || withEmail.length === 0) {
      console.log('[migrate] No writes made.');
      return;
    }

    for (let start = 0; start < withEmail.length; start += 450) {
      const batch = firestore.batch();
      withEmail.slice(start, start + 450).forEach((user) => {
        batch.update(user.ref, { email: FieldValue.delete() });
      });
      await batch.commit();
    }
    console.log(`[migrate] Removed email from ${withEmail.length} profiles.`);
  } finally {
    await deleteApp(app);
  }
}

removeProfileEmails().catch((error) => {
  console.error(`[migrate] ${error.message}`);
  process.exitCode = 1;
});
