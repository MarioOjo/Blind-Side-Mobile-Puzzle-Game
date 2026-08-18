# BlindSide

**Race. Reveal. Challenge.**

A cooperative, social puzzle-solving mobile app. Two people solve a jigsaw puzzle together on one shared device — passing it back and forth by turn — with correctly placed pieces unlocking real conversation prompts. Solo play is also supported for playing at your own pace.

Built as a DV300 project at Open Window Institute.

## Concept

BlindSide is designed around **connection, not competition**. The core cooperative mode intentionally has no winner or loser: two players share one device, rotating it between turns, working toward completing a puzzle together against a shared clock. Each correctly placed piece surfaces a social question, scaling in intimacy as the puzzle nears completion:

- **Acquaintance tier** — early pieces, light questions ("What do you do for work?")
- **Friendship tier** — mid-puzzle, more personal ("What's your go-to comfort food?")
- **Lover tier** — final pieces, deeper questions ("What song instantly reminds you of me?")

> Note: this cooperative, pass-and-play direction was a deliberate pivot from an earlier competitive "beat their time" concept, made in response to progress-milestone feedback that the original design didn't sufficiently support real-life social connection.

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

## Firebase Setup (for a fresh clone)

1. Create a Firebase project, register a **Web** app (not Android/iOS — this project uses the Firebase JS SDK, which works cross-platform through Expo)
2. Enable **Email/Password** sign-in under Authentication → Sign-in method
3. Create a Firestore database
4. Deploy security rules: `npx firebase deploy --only firestore:rules`
5. Deploy indexes: `npx firebase deploy --only firestore:indexes`
6. Seed initial puzzle images and questions: `npm run seed:firestore:production` (requires Application Default Credentials configured — see script for details)

## Testing

```bash
# Run the full Firestore emulator + unit test suite
npm run test:firebase
```

Covers: authentication flow and registration transaction integrity, Firestore security rules (unauthenticated denial, solo/cooperative session ownership, partner-only access, atomic username reservation), bilateral partner-connection writes, and jigsaw puzzle generation (deterministic piece layout, snap tolerance by difficulty).

## Data Model

Firestore collections:

- **`users`** — profile data, `partnerIds` array
- **`usernames`** — normalized lowercase username reservations (case-insensitive uniqueness)
- **`sessions`** — unified for both solo and cooperative play; `mode` field distinguishes them. Cooperative sessions carry `partnerIds`, `piecesPlacedTogether`, and `questionsAnswered`
- **`puzzleImages`** — puzzle image metadata (category, difficulty, image URL)
- **`questions`** — tiered social-question content

Solo and cooperative sessions share one schema rather than separate tables, since both represent "someone completed a puzzle" with mostly-overlapping fields.

## Known Limitations

- **Google Sign-In** — the button exists in the UI but is not functionally wired to real Google OAuth. Real native Google Sign-In requires a custom Expo development build, OAuth client IDs, SHA-1 fingerprints, and Firebase/Google Cloud Console configuration — deliberately deferred as out of scope for the current build phase.
- **Web platform** — not supported; native dependencies prevent it from rendering correctly.
- **Firebase Storage** — not yet configured; puzzle images currently reference external stable URLs rather than uploaded assets.

## Architecture Notes

- **Partner connection uses username search, not invite links** — since cooperative gameplay happens on one shared device between people already physically together, there's no need for async invite/accept infrastructure. Adding a partner is a one-time step; starting a session together requires no invite flow at all.
- **Screens reload-on-focus rather than using live Firestore listeners** — simpler and cheaper for this app's actual needs; nothing requires sub-second real-time sync.
- **Cooperative session creation is followed by an atomic write, not a preceding read** — an earlier version checked username/session validity via a pre-write read, which correctly failed against security rules requiring authentication. The fix moves validation into the same atomic transaction as the write itself.