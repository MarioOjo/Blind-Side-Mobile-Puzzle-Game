# BlindSide

**Race. Reveal. Challenge.**

A cooperative, social puzzle-solving mobile app. Two people solve a jigsaw puzzle together on one shared device — passing it back and forth by turn — with correctly placed pieces unlocking real conversation prompts. Solo play is also supported for playing at your own pace.

Built as a DV300 project at Open Window Institute.

## Concept

BlindSide is designed around **connection, not competition**. The core cooperative mode intentionally has no winner or loser: two players share one device, rotating it between turns, working toward completing a puzzle together against a shared clock. Each correctly placed piece surfaces a social question, scaling in intimacy as the puzzle nears completion:

- **Acquaintance tier** — early pieces, light questions ("What do you do for work?")
- **Friendship tier** — mid-puzzle, more personal ("What's your go-to comfort food?")
- **Lover tier** — final pieces, deeper questions ("What song instantly reminds you of me?")

Before starting, the pair picks how deep questions may go. Questions always start at Acquaintance and climb toward the chosen tier in equal stages, so a Lover puzzle moves through all three tiers while an Acquaintance puzzle stays light throughout.

> Note: this cooperative, pass-and-play direction was a deliberate pivot from an earlier competitive "beat their time" concept, made in response to progress-milestone feedback that the original design didn't sufficiently support real-life social connection.

## What's New in v1.3

- **36 puzzles** — 3 in every category at every difficulty, including new Cape Town scenes (Bo-Kaap, Table Mountain, Lion's Head).
- **Android APK** — BlindSide can now be installed directly on Android, without Expo Go. See [Building the Android APK](#building-the-android-apk).

## What's New in v1.2

- **24 puzzles, up from 16** — 8 new images, so every cooperative category now has 3 puzzles to choose from.
- **Textures category** — a fourth category (leaves, sprinkles, coffee beans, and more) in both solo and cooperative play.
- **Images hosted in Firebase Storage** — puzzle art is still sourced from Unsplash, but players now load BlindSide's own copy, so a photo removed from Unsplash can't break a puzzle.

## What's New in v1.1

- **Partner requests** — connecting now takes consent: send a request by username, and the other player accepts (or declines) from their own account.
- **Escalating questions** — the chosen tier is the deepest level reached; questions build up to it as the puzzle fills. Each tier has 20 questions (60 in total), so no question repeats within a game (v1.1.1).
- **Delete Account** — available on the Profile tab, confirmed with your password.
- **Move counter** — shown on the completion screens for solo and cooperative play.
- **Save warning** — a banner appears if autosave fails, so progress is never silently lost.
- **Privacy** — email addresses are no longer stored on public profiles or shown in partner search.

See [CHANGELOG.md](CHANGELOG.md) for the full list of fixes, security changes, and deployment steps.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo / React Native (SDK 54 — intentionally pinned, do not upgrade without reason) |
| Navigation | React Navigation (Native Stack + Bottom Tabs) |
| Auth | Firebase Authentication (email/password) |
| Database | Cloud Firestore |
| Gestures | react-native-gesture-handler, react-native-reanimated |
| Graphics | react-native-svg, expo-linear-gradient |
| Icons | @expo/vector-icons |
| Orientation | expo-screen-orientation |

**Firebase project region:** `africa-south1` (Johannesburg).

## Project Structure

```
BlindSide/
├── src/
│   ├── screens/        # All screen components (Login, Home, Profile, Puzzle, etc.)
│   ├── navigation/      # RootNavigator, AuthStack, MainTabs, HomeStack, ChallengesStack
│   ├── services/        # AuthService, FirestoreService — backend logic layer
│   ├── theme/            # colors.js, typography.js — design tokens
│   ├── components/     # Reusable UI: Card, PrimaryButton, ChallengeListItem
│   └── utils/               # jigsaw.js — puzzle piece generation logic
├── tests/                     # Unit tests + Firestore emulator rules tests
├── firestore.rules            # Security rules
├── firestore.indexes.json     # Composite indexes
├── firebase.json              # Firebase project config
├── .env.example                # Required environment variables (template, no real values)
└── app.json                    # Expo config
```

There is no separate "backend" folder or codebase — Firebase is a managed backend service, not custom server code. `src/services/` is the equivalent backend-logic layer, cleanly separated from screens and components.

## Navigation Structure

Four bottom tabs: **Home**, **Challenges**, **Results**, **Profile**.

Puzzle gameplay, category/difficulty selection, and partner connection are nested screens reached from Home or Challenges — not top-level tabs. Puzzle gameplay is a screen you *do*, not a destination you browse to.

## Design System

| Token | Value | Use |
|---|---|---|
| Midnight Navy | `#0F172A` | Primary background |
| Electric Blue | `#2563EB` | Primary interactive color |
| Neon Cyan | `#06B6D4` | Highlights, active states |
| Victory Gold | `#FACC15` | Achievement, solo-mode accent |

## Getting Started

```bash
# Clone and enter the project (note: the actual Expo project is one level
# inside the repo root — cd into the inner BlindSide folder before anything else)
git clone <repo-url>
cd BlindSide

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in real Firebase config values in .env — get these from
# Firebase Console → Project Settings → your registered web app.
# Never commit real values — .env is gitignored, .env.example should stay
# placeholder-only.

# Start the dev server
npx expo start -c
```

Scan the QR code with Expo Go (Android/iOS), or press `a` for Android emulator, `i` for iOS simulator.

**Web is not a supported platform** — several native-only dependencies (Firebase Auth persistence, SVG rendering paths) are not web-compatible, and web has never been part of this project's target platforms.

## Building the Android APK

Builds run in the cloud on EAS Build with a free [Expo account](https://expo.dev/signup).

```bash
npx eas-cli login          # once per machine
npm run build:apk          # ~10–20 minutes; first run asks to create the EAS project and a signing keystore (say yes)
```

When it finishes, EAS prints a link to the build page. Open it on an Android phone to download and install the APK (Android will ask to allow installs from that source). Share the same link with testers.

The build reads Firebase settings from `.env`, which `.easignore` uploads to EAS even though git ignores it.

## Firebase Setup (for a fresh clone)

1. Create a Firebase project, register a **Web** app (not Android/iOS — this project uses the Firebase JS SDK, which works cross-platform through Expo)
2. Enable **Email/Password** sign-in under Authentication → Sign-in method
3. Create a Firestore database, and enable **Storage** (Build → Storage → Get started; requires the Blaze plan)
4. Deploy security rules: `npx firebase deploy --only firestore:rules,storage` (when upgrading from v1.0, deploy these together with the v1.1 app — see [CHANGELOG.md](CHANGELOG.md))
5. Deploy indexes: `npx firebase deploy --only firestore:indexes`
6. Seed initial puzzle images and questions: `npm run seed:firestore:production` (requires Application Default Credentials configured — see script for details). This also copies each puzzle image from Unsplash into Storage.
7. Upgrading from v1.0 only: strip stored emails from existing profiles with `npm run migrate:remove-emails:production` (see `scripts/README.md`)

## Testing

```bash
# Unit tests only (no emulator or Java needed)
npm test

# Full Firestore emulator + unit test suite
npm run test:firebase
```

Covers: authentication flow, registration transaction integrity, and username validation; Firestore security rules (unauthenticated denial, solo/cooperative session ownership and locked ownership fields, partner-only cooperative sessions, atomic username reservation, email-free profiles); the partner request flow (send, accept, decline, cancel, and forged-request rejection); account deletion; cooperative turn logic and tier escalation; and jigsaw puzzle generation (deterministic piece layout, snap tolerance by difficulty).

## Data Model

Firestore collections:

- **`users`** — public profile data (username, profile image, `partnerIds` array). Readable by any signed-in player for partner search, so it never stores the email address — that stays private in Firebase Auth
- **`usernames`** — normalized lowercase username reservations (case-insensitive uniqueness); usernames are 3–20 letters, numbers, `_`, or `.`
- **`partnerRequests`** — pending partner requests keyed `<fromUid>_<toUid>`; readable only by the two players, and removed when accepted, declined, or cancelled
- **`sessions`** — unified for both solo and cooperative play; `mode` field distinguishes them. Both modes record `movesTaken`; cooperative sessions also carry `partnerIds`, `tier` (the deepest tier reached), `piecesPlacedTogether`, `questionsAnswered`, and `questionsSkipped`
- **`puzzleImages`** — puzzle image metadata (category, difficulty, image URL). The URL points at the image's copy in Firebase Storage (`puzzleImages/<imageId>.jpg`); the seed manifest keeps the original Unsplash URL as the source
- **`questions`** — tiered social-question content

Solo and cooperative sessions share one schema rather than separate tables, since both represent "someone completed a puzzle" with mostly-overlapping fields.

## Known Limitations

- **Google Sign-In** — the button exists in the UI but is not functionally wired to real Google OAuth. Real native Google Sign-In requires a custom Expo development build, OAuth client IDs, SHA-1 fingerprints, and Firebase/Google Cloud Console configuration — deliberately deferred as out of scope for the current build phase.
- **Web platform** — not supported; native dependencies prevent it from rendering correctly.

## Architecture Notes

- **Partner connection uses username search plus a request/accept step** — v1.0 connected players instantly, but that let anyone link themselves to any account they knew the username of. Since v1.1 the other player must accept from their own account. It's still a one-time step: once connected, starting a session together on the shared device needs no invite at all.
- **Screens reload-on-focus rather than using live Firestore listeners** — simpler and cheaper for this app's actual needs; nothing requires sub-second real-time sync.
- **Cooperative session creation is followed by an atomic write, not a preceding read** — an earlier version checked username/session validity via a pre-write read, which correctly failed against security rules requiring authentication. The fix moves validation into the same atomic transaction as the write itself.