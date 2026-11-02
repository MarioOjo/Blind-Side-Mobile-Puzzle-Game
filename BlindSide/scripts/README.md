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

Never commit service-account keys or other credentials. The direct Unsplash image URLs are suitable for development and demos, but should move to Firebase Storage or an owned CDN before the assets become a production dependency.

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
