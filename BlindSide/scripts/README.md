# Firestore gameplay seeds

The seed command uses the Firebase Admin SDK because client writes to `puzzleImages` and `questions` are intentionally denied by Firestore rules.

Validate content without connecting to Firebase:

```powershell
npm run seed:firestore:dry-run
```

Seed the local Firestore emulator at `127.0.0.1:8080`:

```powershell
npm run seed:firestore
```

Override the emulator target or project when needed:

```powershell
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
$env:FIREBASE_PROJECT_ID = 'demo-blindside'
npm run seed:firestore
```

Production seeding is intentionally explicit and uses Application Default Credentials:

```powershell
$env:FIREBASE_PROJECT_ID = 'YOUR_FIREBASE_PROJECT_ID'
npm run seed:firestore:production
```

The script also accepts `--project=PROJECT_ID` when invoked directly with Node. Environment variables are recommended for npm 11 because npm reserves some command-line flags.

Never commit service-account keys or other credentials.

## Puzzle images and Firebase Storage

Each puzzle in `firestore-seed-manifest.cjs` lists its **source** Unsplash URL. When seeding production, the script downloads each image and uploads it to the project's Storage bucket at `puzzleImages/<imageId>.jpg`, then writes that copy's download URL to Firestore. Players never load images from Unsplash directly, so a photo removed there can't break a puzzle.

- Re-seeding reuses files whose source URL hasn't changed, so download URLs stay stable. Change a puzzle's `imageURL` in the manifest to replace its image.
- The bucket defaults to `<projectId>.firebasestorage.app`; override it with `$env:FIREBASE_STORAGE_BUCKET`.
- Storage must be enabled in the Firebase console (Blaze plan) and `storage.rules` deployed: `npx firebase deploy --only storage`.
- Against the emulators, images are mirrored only when the Storage emulator is running (`FIREBASE_STORAGE_EMULATOR_HOST` is set, as `firebase emulators:exec --only firestore,storage` does). Otherwise documents keep their Unsplash URLs.

To add a puzzle: find a free (not Unsplash+) photo on Unsplash, open `https://unsplash.com/photos/<id>/download` to get its `https://images.unsplash.com/photo-…` address, add an entry to the manifest, and update the image count in `validateManifest` and the tests.

# v1.1 privacy migration: remove stored emails

Profiles created before v1.1 stored the player's email, which any signed-in player could read. The app now removes it automatically the next time each player opens the Home tab. This script cleans up the accounts that never sign in again.

Count affected profiles without writing (production, Application Default Credentials):

```powershell
node scripts/remove-profile-emails.cjs --production --dry-run
```

Remove the field from every profile:

```powershell
npm run migrate:remove-emails:production
```

Without `--production` the script targets the emulator (`npm run migrate:remove-emails`).
