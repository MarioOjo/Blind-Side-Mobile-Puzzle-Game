# Changelog

## v1.4.0 — Sign in with Google

- **Google sign-in on Log In and Create Account.** Uses `@react-native-google-signin/google-signin` to get a Google ID token, then signs in to Firebase with it. The button only appears when the native module and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` are both present, so Expo Go hides it instead of crashing.
- **Choose a username.** A first-time Google player has no BlindSide profile, so `RootNavigator` now checks for one and shows the new `ChooseUsernameScreen` until a username is reserved. Profiles are written by the same transaction as email registration (`writeProfile`), so Firestore rules are unchanged. "Use a different account" signs out.
- **Delete Account for Google players.** Google-only accounts confirm with the Google account picker instead of a password. Accounts with a password keep the password prompt.
- **Log out clears the Google account choice,** so the next sign-in shows the account picker.
- New `GoogleSignInService` wraps the native module and maps its errors (cancelled, Play services missing, misconfigured SHA-1) to clear messages.
- `app.json` registers the Google Sign-In config plugin. Its required `iosUrlScheme` is the reversed Web client ID; replace it with an iOS client ID before any iPhone build.
- 7 new AuthService tests (68 total).

### Deploying v1.4

1. In the Firebase console, enable the Google provider and set its support email.
2. Run `npx eas-cli credentials` → Android → preview, and copy the SHA-1 fingerprint.
3. In Project settings, add an Android app with package `com.marioojo.blindside` and that SHA-1.
4. Make sure `.env` has `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (see `.env.example`).
5. `npm run build:apk`. Google sign-in only works in this build, not in Expo Go.

## v1.3.3 — Consistent corners and faded text

- **Corner radius scale.** New `src/theme/radii.js` (`sm` 8, `md` 12, `lg` 16, `pill`) replaces 12 different hard-coded corner sizes. Circular avatars and badges keep a radius of half their size.
- **Two faded-text shades.** New `textSecondary` (65% white) for supporting text and the existing `textMuted` (50% white) for hints, dates, and placeholders replace about a dozen slightly different opacities. The locked-milestone padlock keeps its dimmer disabled look.

## v1.3.2 — Consistent auth screens and colours

- **Create Account now matches Log In.** Both screens share one layout (`AuthLayout`): the puzzle badge, the two-tone wordmark, the tagline, and the footer. Create Account previously had a plain logo and plain input boxes, and it did not scroll, so the keyboard or a landscape screen could hide its fields.
- **Shared input fields.** Both screens use `AuthTextField`: an icon in each field and the same rounded border. Create Account also gains the show-password toggle. The email field icon is now an envelope on both screens.
- **Faded placeholders.** Placeholder text such as "Email" was solid white, so it looked like typed text. It is now faded white, as on the partner search screen.
- **Named theme colours.** New `textMuted`, `error` (inline error messages), and `danger` (destructive actions such as Delete Account) tokens replace hard-coded values. The Solo button tint on Home now uses the brand Victory Gold instead of a near-match amber.

## v1.3.1 — Remove the Google sign-in button

- **Removed "Continue with Google" from the login screen.** It was never wired to Google OAuth and only showed an error, so it looked broken. Email and password is the only sign-in method. The unused `GoogleButton` and `GoogleIcon` components are deleted.
- `app.json` now carries the EAS project ID created by the first `npm run build:apk`.

## v1.3.0 — Full puzzle catalog and Android APK

- **12 new puzzle images (36 total).** Every category now has 3 puzzles at every difficulty. Several Easy and Medium categories had a single puzzle, so tapping them jumped straight into the same image every time.
  - Easy: Bright Smile, Knitted Beanie (People); Bo-Kaap Colours, Table Mountain Sunset (Places); Rainbow Pencils, Citrus Slices (Textures)
  - Medium: Tin Robot, Nesting Dolls (Characters); Fabric Market (People); Lion's Head Cable Car (Places); Beach Pebbles, Yarn Wall (Textures)
- **Installable Android build.** New `eas.json` with a `preview` profile that produces an APK through EAS Build (`npm run build:apk`). The Android package is `com.marioojo.blindside`.
- New `.easignore` so EAS Build receives `.env` (the Firebase config) while it stays out of git.
- Catalog tests updated for 3 puzzles per category; single-puzzle routing is now tested with a filtered catalog.

### Deploying v1.3

1. `npm run seed:firestore:production` (uploads the 12 new images; the existing 24 are reused).
2. `npm run build:apk` and share the APK link from the EAS dashboard.

## v1.2.0 — More puzzles, Textures, and self-hosted images

- **8 new puzzle images (24 total, up from 16).** Cooperative play only uses Hard puzzles, and some categories had just one, so the picker was skipped and the same puzzle came up every time. Every category now has 3 Hard puzzles (12 cooperative puzzles, up from 4).
  - Characters: Graffiti Monsters
  - People: Holi Festival, Carnival Dancers
  - Places: Burano Canal, Hot Air Balloons
  - Textures: Autumn Leaves, Candy Sprinkles (Hard), Paint Swirl (Easy)
- **Textures is now a selectable category.** It was a valid category in the data, but the app only offered Characters, People, and Places, so the existing Brick Wall and Coffee Beans puzzles could never be played. It now appears in solo (Easy, Medium, and Hard) and cooperative play.
- **Puzzle images are served from Firebase Storage.** Images are still sourced from Unsplash (free licence), but the seed script now copies each one into the project's Storage bucket (`puzzleImages/<imageId>.jpg`) and stores that URL in Firestore. Unchanged images are reused on re-seed, so URLs stay stable.
- New `storage.rules`: signed-in players can read puzzle images; nobody can write from the app.
- The Storage emulator is now configured (port 9199), and seed verification checks that images are served from Storage when it runs.
- The cooperative catalog test now loads the real category list instead of its own copy, which had silently gone stale.
- Result: **80 / 80 passing** under `npm run test:firebase`.

### Deploying v1.2

1. Enable Storage in the Firebase console (Build → Storage → Get started; Blaze plan).
2. `npx firebase deploy --only storage`
3. `npm run seed:firestore:production` (uploads the 24 images and points Firestore at them).
4. Ship the app update. Older builds keep working: they read the same `imageURL` field, but won't show the Textures category.

## v1.1.1 — Expanded question pool

- **60 conversation questions, up from 15** (20 per tier). With v1.1's escalating tiers, a 48-piece cooperative puzzle asks about 15 questions, and the old pool of 5 per tier repeated questions within a single game: 3 repeats when going up to Friendship, and every question three times on Acquaintance. Every tier choice now gets a full game with no repeats.
- New test (`cooperative.turn.test.cjs`) plays a whole 48-piece puzzle for each tier choice and fails if any question repeats, so future content edits can't bring the problem back.
- Seed validation now expects 20 questions per tier (`scripts/seed-firestore.cjs`).
- **Deploying:** run `npm run seed:firestore:production` to load the new questions. No rules or app-code changes are needed. The seed only adds or overwrites question and puzzle documents.

## v1.1.0 — Privacy, consent, and gameplay fixes

A review pass over the v1.0 build. Version bumped to `1.1.0` in `package.json`, `package-lock.json`, and `app.json`.

### New features

- **Partner requests (consent-based connections).** Adding a partner now sends a request that the other player must accept on their own account. The Find a Partner screen lists *Requests for you* (Accept / Decline) and *Sent requests* (Cancel). Searching for someone who has already sent you a request offers *Accept Request* instead. The Home dashboard's partner button shows `Requests (N)` when requests are waiting.
- **Escalating question tiers.** The tier picked before a cooperative puzzle is now the *deepest* level questions will reach. Questions start light and climb as the puzzle fills: with *Lover*, the first third of the puzzle asks Acquaintance questions, the middle third Friendship, and the final third Lover. With *Friendship* it's halves, and *Acquaintance* stays light throughout. The tier screen now reads "How deep should questions go?".
- **Account deletion.** Profile → *Delete Account* asks for the password, then removes the profile, username reservation, solo history, pending partner requests, and the player's entry in each partner's list, then deletes the login. Cooperative sessions are kept because they're shared history that also belongs to the partner.
- **Move counter.** Every finished drag (placed or not) counts as a move. Moves are saved with each checkpoint, restored when resuming, and shown on both completion screens.
- **Save-failure warning.** If an autosave fails, a gold "Progress not saved — check your connection" pill appears over the puzzle, and the pause dialog warns that leaving may lose progress instead of promising everything is saved.

### Security & privacy

- **Emails are no longer stored on public profiles.** Any signed-in player could read every `users` document, including email addresses, and the partner search screen displayed them.
  - New profiles never store `email` (rules reject it on create).
  - Partner search returns only public fields (id, username, profile image, partner list).
  - Existing profiles: each player's email is removed automatically the next time they open the Home tab. `scripts/remove-profile-emails.cjs` (`npm run migrate:remove-emails:production`) cleans up accounts that never sign in again.
- **Partner lists need a matching request.** Previously any signed-in user could append themselves to anyone's `partnerIds`. Now an addition is only allowed when backed by a `partnerRequests/<fromUid>_<toUid>` document, and only the recipient can complete it.
- **Cooperative sessions need an accepted partner.** A session can only be created with someone in the creator's `partnerIds`.
- **Session ownership is locked.** Updates can no longer change `mode`, `userId`, `partnerIds`, `puzzleId`, or `createdAt`.
- **Username format enforced.** 3–20 characters: letters, numbers, `_`, or `.`. Checked in the register screen, in `registerUser` (before the Auth account is created, so no rollback is needed), and in the rules on create. Existing usernames are unaffected.

### Bug fixes

- **Side effects removed from state updaters** (`PuzzleScreen`). Firestore writes and phase changes were running inside `setTurnState(updater)`, which React may call twice. Turn state now goes through a ref plus `commitTurnState`, and side effects run outside it.
- **Final cooperative stats were off by one.** The completion write used turn state from before the last piece, so `turnCount` was one short and counts could be stale. The final placement is now counted before completion.
- **Question counts saved immediately.** Answering or skipping a question now saves `questionsAnswered` / `questionsSkipped` straight away instead of waiting for the next piece.
- **Player 1 shows their username** instead of "You", which was ambiguous on a shared device.
- **`completedAt` uses the server timestamp** instead of the device clock.
- **`movesTaken` is real data** (was always saved as `0`).

### Polish

- `app.json`: `userInterfaceStyle` is now `dark`, and the splash uses the branded puzzle-piece icon on Midnight Navy (`#0F172A`) instead of Expo's white placeholder.
- Silent `.catch(() => {})` handlers on autosaves now feed the save-failure warning.

### Tests & tooling

- New `npm test` runs every unit test without the emulator. `cooperative.turn.test.cjs` was previously not in any script and is now in both `npm test` and `npm run test:firebase`.
- Fixed the stale cooperative-statistics test (it didn't expect `questionsAnswered` / `questionsSkipped`).
- New tests: username validation and email-free profiles, tier escalation, rules for partner requests (send / accept / decline / cancel / forgery), legacy email removal, partner-only cooperative sessions, locked session ownership, and end-to-end account deletion.
- Result: **79 / 79 passing** under `npm run test:firebase`.

### Deploying v1.1

The app and the rules depend on each other, so release them together:

1. `npx firebase deploy --only firestore:rules`
2. Ship the app update.
3. Optionally run `npm run migrate:remove-emails:production` to strip emails from inactive accounts.

Older app builds can't add partners under the new rules (the old one-step "Add Partner" is now rejected), and the new app can't register users under the old rules (they still require `email`).
