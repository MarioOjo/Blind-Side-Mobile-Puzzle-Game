# BlindSide

**Race. Reveal. Challenge.**

A cooperative, social puzzle-solving mobile app. Two people solve a jigsaw puzzle together on one shared device — passing it back and forth by turn — with correctly placed pieces unlocking real conversation prompts. Solo play is also supported for playing at your own pace.

Built as a DV300 project at Open Window Institute.

**Current version: v1.4.1** · ▶ [Watch the demo](Demo.mp4) · 📱 [Install on Android (v1.4.1 APK)](https://expo.dev/accounts/marioojo/projects/BlindSide/builds/8f1815ca-def4-4cba-babb-d2a49ad3e2bb) · 📝 [Changelog](CHANGELOG.md)

---

## Contents

- [Concept](#concept)
- [Features](#features)
- [How to Play](#how-to-play)
- [Try It Yourself](#try-it-yourself)
  - [Option A — Install the APK](#option-a--install-the-apk-android)
  - [Option B — Run from source](#option-b--run-from-source)
  - [Firebase Setup](#firebase-setup-for-a-fresh-clone)
  - [Local Development with Emulators](#local-development-with-emulators)
  - [Building the Android APK](#building-the-android-apk)
  - [Troubleshooting](#troubleshooting)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Navigation Structure](#navigation-structure)
- [Data Model](#data-model)
- [Testing](#testing)
- [Design System](#design-system)
- [Architecture Notes](#architecture-notes)
- [Known Limitations](#known-limitations)
- [Version History](#version-history)

---

## Concept

BlindSide is designed around **connection, not competition**. The core cooperative mode intentionally has no winner or loser: two players share one device, rotating it between turns, working toward completing a puzzle together against a shared clock. Every third correctly placed piece surfaces a social question for both players to talk about, and the questions grow more personal as the puzzle fills:

- **Acquaintance tier** — light questions ("What do you do for work?")
- **Friendship tier** — more personal ("What's your go-to comfort food?")
- **Lover tier** — deeper questions ("What song instantly reminds you of me?")

Before starting, the pair picks how deep questions may go. Questions always start at Acquaintance and climb toward the chosen tier in equal stages, so a Lover puzzle moves through all three tiers (a third of the puzzle each), a Friendship puzzle splits into halves, and an Acquaintance puzzle stays light throughout.

> Note: this cooperative, pass-and-play direction was a deliberate pivot from an earlier competitive "beat their time" concept, made in response to progress-milestone feedback that the original design didn't sufficiently support real-life social connection.

## Features

**Accounts**
- Email/password registration, or **Sign in with Google** (installed APK only — see [Known Limitations](#known-limitations)). First-time Google players choose a username.
- Unique, case-insensitive usernames (3–20 letters, numbers, `_` or `.`)
- Password reset by email, and **Delete Account** from the Profile tab
- Email addresses are never stored on public profiles or shown in search

**Solo mode — "Your pace"**
- Three difficulties, each with its own grid and snap tolerance:

  | Difficulty | Grid | Pieces | Snap tolerance |
  |---|---|---|---|
  | Easy | 3 × 2 | 6 | most forgiving |
  | Medium | 4 × 3 | 12 | moderate |
  | Hard | 5 × 4 | 20 | tightest |

- Timer, move counter and personal best per puzzle

**Cooperative mode — "Together"**
- **Partner requests** — find a player by exact username and send a request; they accept or decline from their own account. Connecting is a one-time step.
- 48-piece (8 × 6) puzzle played on one device, with a pass-the-device overlay between turns
- A question every 3rd correct placement; **both** players confirm they've discussed it, or skip it. 20 questions per tier, so no question repeats within a game
- Shared wall-clock timer — no personal bests, because this mode is about communication, not speed

**Gameplay (both modes)**
- Interlocking jigsaw pieces with drag-and-snap gestures
- Landscape-only board — the app asks you to rotate your device
- First-time onboarding overlays for each mode
- Autosave with a warning if a save fails; unfinished puzzles resume from **Recent Activity** on Home, timer and moves intact
- Completion screens with time and moves (solo: personal-best feedback; cooperative: turns, questions discussed and skipped)

**Progress**
- **Challenges** — milestones computed live from your history: *First Piece*, *Puzzle Enthusiast*, *Puzzle Veteran*, *Puzzle Master*, *Personal Best*, *Hard Mode*, *Full Spectrum* (solo); *Better Together*, *Social Puzzler*, *Deep Conversations*, *The Full Picture* (cooperative)
- **Results** — chronological run history with Solo and Cooperative tabs
- **Profile** — solo stats (puzzles completed, fastest time, total play time, personal bests) and cooperative stats (puzzles together, partners played with, questions discussed and skipped)

**Content** — 36 puzzles: 3 in every category (Characters, People, Places, Textures) at every difficulty, including Cape Town scenes (Bo-Kaap, Table Mountain, Lion's Head). 60 conversation questions, 20 per tier.

## How to Play

**Solo:** Home → **Solo** → choose a difficulty → choose a category → choose a puzzle → rotate to landscape → drag each piece from the tray to its place. It snaps in when it's close enough.

**Cooperative:**
1. **Connect once.** Both players need an account. One taps **Add a partner** on Home and searches the other's exact username. The other player opens **Requests** on their Home screen and accepts.
2. On one phone: Home → **Together** → choose how deep questions should go → choose a category → choose a puzzle.
3. Take turns placing pieces, passing the phone when the turn overlay appears.
4. When a question appears, talk about it, then both tap to confirm — or skip it.

## Try It Yourself

### Option A — Install the APK (Android)

The quickest way to play. Open the [v1.4.1 APK link](https://expo.dev/accounts/marioojo/projects/BlindSide/builds/8f1815ca-def4-4cba-babb-d2a49ad3e2bb) on an Android phone, download the APK, and allow installs from that source when Android asks. This build connects to the live BlindSide Firebase project, so you can create an account and play straight away — including Google sign-in.

Requires Android 7.0 or newer.

> **"App not installed"?** Google Play Protect blocks apps from outside the Play Store. Open Play Store → profile icon → **Play Protect** → ⚙️ → turn off **Scan apps with Play Protect**, install BlindSide, then turn it back on. (Sometimes Play Protect offers **More details → Install anyway** instead.)
>
> **Samsung (One UI 6+):** also turn off **Auto Blocker** under Settings → Security and privacy while installing.

iPhone: there's no iOS build. Use Option B with Expo Go.

### Option B — Run from source

**Requirements**
- [Node.js](https://nodejs.org/) LTS (developed on Node 24) and npm
- **Expo Go** on an Android or iOS phone, for **Expo SDK 54** — or an Android emulator / iOS simulator (macOS only)
- Your own Firebase project — see [Firebase Setup](#firebase-setup-for-a-fresh-clone). Or skip Firebase entirely with the [emulators](#local-development-with-emulators)

```bash
# Clone and enter the project (note: the actual Expo project is one level
# inside the repo root — cd into the inner BlindSide folder before anything else)
git clone https://github.com/MarioOjo/Blind-Side-Mobile-Puzzle-Game.git
cd Blind-Side-Mobile-Puzzle-Game/BlindSide

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in real Firebase config values in .env (table below).
# Never commit real values — .env is gitignored, .env.example should stay
# placeholder-only.

# Start the dev server (-c clears the bundler cache)
npx expo start -c
```

Scan the QR code with Expo Go (Android: from inside the app; iOS: with the Camera app), or press `a` for an Android emulator, `i` for the iOS simulator. Phone and computer must be on the same Wi-Fi network.

**Web is not a supported platform** — several native-only dependencies (Firebase Auth persistence, SVG rendering paths) are not web-compatible, and web has never been part of this project's target platforms.

**Environment variables (`BlindSide/.env`)**

| Variable | Where to find it |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project settings → your registered **Web** app |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | same |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | same |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | same |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | same |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | same |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Authentication → Sign-in method → Google → Web SDK configuration. Optional — without it the Google button is hidden |
| `EXPO_PUBLIC_USE_FIREBASE_EMULATORS` | `true` to use the local emulators, otherwise `false` |

Expo inlines `EXPO_PUBLIC_*` values when it bundles, so restart with `npx expo start -c` after editing `.env`.

### Firebase Setup (for a fresh clone)

1. Create a Firebase project, register a **Web** app (not Android/iOS — this project uses the Firebase JS SDK, which works cross-platform through Expo)
2. Enable **Email/Password** and **Google** sign-in under Authentication → Sign-in method. Copy the Google provider's **Web client ID** (Web SDK configuration) into `.env` as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Then add an **Android** app in Project settings with package `com.marioojo.blindside` and the SHA-1 from `npx eas-cli credentials` (Android → preview), or Google sign-in fails with "isn't set up for this version of the app"
3. Create a Firestore database, and enable **Storage** (Build → Storage → Get started; requires the Blaze plan)
4. Deploy security rules: `npx firebase deploy --only firestore:rules,storage` (when upgrading from v1.0, deploy these together with the v1.1 app — see [CHANGELOG.md](CHANGELOG.md))
5. Deploy indexes: `npx firebase deploy --only firestore:indexes`
6. Seed initial puzzle images and questions: `npm run seed:firestore:production` (requires Application Default Credentials configured — see [scripts/README.md](BlindSide/scripts/README.md)). This also copies each puzzle image from Unsplash into Storage. Without this step the app runs but has no puzzles or questions.
7. Upgrading from v1.0 only: strip stored emails from existing profiles with `npm run migrate:remove-emails:production` (see `scripts/README.md`)

### Local Development with Emulators

Run the whole app against local Firebase emulators — no Firebase project, Blaze plan or credentials needed (Java is required for the Firebase Emulator Suite):

```bash
cd BlindSide

# 1. Start the Auth, Firestore and Storage emulators (Emulator UI is printed in the output)
npm run emulators

# 2. In a second terminal, load puzzles and questions into the emulator
npm run seed:firestore

# 3. Set EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true in .env, then
npx expo start -c
```

Emulator ports: Auth `9099`, Firestore `8080`, Storage `9199`. A physical phone must be able to reach your computer on those ports.

| Seed / data command | What it does |
|---|---|
| `npm run seed:firestore` | Seeds the local emulator |
| `npm run seed:firestore:dry-run` | Validates seed content without connecting to Firebase |
| `npm run seed:firestore:verify` | Checks the seeded data (and that images are served from Storage) |
| `npm run seed:firestore:production` | Seeds a real project — explicit opt-in, uses Application Default Credentials |
| `npm run migrate:remove-emails[:production]` | v1.0 → v1.1 migration: removes emails from old profiles |

### Building the Android APK

To just install the latest build, see [Option A](#option-a--install-the-apk-android). To build your own:

Builds run in the cloud on EAS Build with a free [Expo account](https://expo.dev/signup).

```bash
npx eas-cli login          # once per machine
npm run build:apk          # ~10–20 minutes; first run asks to create the EAS project and a signing keystore (say yes)
```

When it finishes, EAS prints a link to the build page. Open it on an Android phone to download and install the APK (Android will ask to allow installs from that source). Share the same link with testers.

The build reads Firebase settings from `.env`, which `.easignore` uploads to EAS even though git ignores it.

### Troubleshooting

| Problem | Fix |
|---|---|
| `Failed to resolve plugin for module "expo-…"` / "Do you have node modules installed?" | Run `npm install` inside `BlindSide/` |
| `npm` can't find `package.json`, or Expo can't find the project | You're in the repo root — `cd BlindSide` first |
| `Unknown command: "npx"` | Run `npx expo start -c`, not `npm npx …` |
| Expo Go says the project's SDK version isn't supported | Your Expo Go is for a different SDK. This project uses SDK 54 — install the matching Expo Go from [expo.dev/go](https://expo.dev/go), or use the APK |
| No Google button in Expo Go | Expected — Google sign-in needs the APK build |
| Google sign-in fails with "isn't set up for this version of the app" | The build's SHA-1 isn't registered in Firebase — see Firebase Setup step 2 |
| Login or loading fails immediately | `.env` is missing or wrong; fix it and restart with `npx expo start -c` |
| Puzzle selection screens are empty | Firestore hasn't been seeded — Firebase Setup step 6, or `npm run seed:firestore` for emulators |
| APK says "App not installed" | Play Protect is blocking it — see the note under [Option A](#option-a--install-the-apk-android). On Samsung, also turn off Auto Blocker |
| Port 8081 is already in use | Another Expo server is running — close it, or accept Expo's offer of another port |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo / React Native (SDK 54 — intentionally pinned, do not upgrade without reason) |
| Navigation | React Navigation (Native Stack + Bottom Tabs) |
| Auth | Firebase Authentication (email/password and Google via `@react-native-google-signin/google-signin`) |
| Database | Cloud Firestore |
| File storage | Firebase Storage (puzzle images) |
| Gestures | react-native-gesture-handler, react-native-reanimated |
| Graphics | react-native-svg, expo-linear-gradient |
| Fonts & icons | @expo-google-fonts (Orbitron, Poppins, Inter), @expo/vector-icons |
| Orientation | expo-screen-orientation |
| Build | EAS Build (Android APK, `preview` profile) |
| Tooling | Firebase CLI + Emulator Suite, Firebase Admin SDK (seeding), Node's built-in test runner |

**Firebase project region:** `africa-south1` (Johannesburg).

There are no Cloud Functions, custom server or AI services — app logic runs on the device, Firestore and Storage security rules enforce access, and seeding runs locally through the Admin SDK.

## Project Structure

```
BlindSide/
├── App.js, index.js           # App entry point
├── src/
│   ├── screens/               # 19 screens — Login, Register, ChooseUsername, Home dashboard,
│   │                          #   solo & cooperative selection flows, Puzzle, completion screens,
│   │                          #   PartnerConnection, Challenges, Results, Profile, Splash
│   ├── navigation/            # RootNavigator, AuthStack, MainTabs, HomeStack, ChallengesStack
│   ├── services/              # Backend logic layer: AuthService, GoogleSignInService,
│   │                          #   FirestoreService, PartnerService, FirebaseConfig
│   ├── models/                # User, Session, PuzzleImage, Question — Firestore document shapes
│   ├── components/            # JigsawBoard, JigsawPiece, AuthLayout, AuthTextField,
│   │                          #   onboarding / turn / exit / delete-account overlays,
│   │                          #   selection rows, Card, PrimaryButton, GoogleButton, PuzzleMark
│   ├── utils/                 # Pure game logic (no React):
│   │                          #   jigsaw.js            — piece geometry, tray order, snap tolerance
│   │                          #   jigsawBoardLayout.js — board sizing
│   │                          #   cooperativeTurn.js   — turns, question timing, tier escalation
│   │                          #   soloRun, soloStats, soloSessions, cooperativeSessions
│   │                          #   puzzleCatalog, cooperativeCatalog — puzzle filtering
│   │                          #   challenges.js        — milestone definitions
│   │                          #   orientationPolicy.js — landscape gating
│   ├── theme/                 # colors, typography, radii, shadows, overlayScale — design tokens
│   ├── constants/             # colors, fonts
│   └── assets/                # bundled images
├── scripts/                   # Seed, verify and migration scripts + seed manifest (see scripts/README.md)
├── tests/                     # Unit tests + Firestore emulator rules tests
├── assets/                    # App icon, adaptive icon, splash, favicon
├── firestore.rules            # Firestore security rules
├── storage.rules              # Storage security rules
├── firestore.indexes.json     # Composite indexes
├── firebase.json              # Firebase config (rules, emulator ports)
├── eas.json                   # EAS Build profiles (preview → APK)
├── .easignore                 # Lets EAS receive .env while git ignores it
├── .env.example               # Required environment variables (template, no real values)
└── app.json                   # Expo config
```

There is no separate "backend" folder or codebase — Firebase is a managed backend service, not custom server code. `src/services/` is the equivalent backend-logic layer, cleanly separated from screens and components. Game rules live in `src/utils/` as plain functions so they can be unit-tested without React Native.

## Navigation Structure

`RootNavigator` shows the **Auth** stack when signed out, **Choose Username** for a first-time Google player without a profile, and the main tabs otherwise.

Four bottom tabs: **Home**, **Challenges**, **Results**, **Profile**.

| Stack | Screens |
|---|---|
| Auth | Login, Register |
| Home | Dashboard → *Solo:* Difficulty → Category → Puzzle selection · *Together:* Tier → Category → Puzzle selection → Puzzle → Solo / Cooperative completion; Partner connection |
| Challenges | Challenge list, Challenge detail |

Puzzle gameplay, category/difficulty selection, and partner connection are nested screens reached from Home or Challenges — not top-level tabs. Puzzle gameplay is a screen you *do*, not a destination you browse to.

## Data Model

Firestore collections:

- **`users`** — public profile data (username, profile image, `partnerIds` array). Readable by any signed-in player for partner search, so it never stores the email address — that stays private in Firebase Auth
- **`usernames`** — normalized lowercase username reservations (case-insensitive uniqueness); usernames are 3–20 letters, numbers, `_`, or `.`
- **`partnerRequests`** — pending partner requests keyed `<fromUid>_<toUid>`; readable only by the two players, and removed when accepted, declined, or cancelled
- **`sessions`** — unified for both solo and cooperative play; `mode` field distinguishes them. Both modes record `movesTaken`; cooperative sessions also carry `partnerIds`, `tier` (the deepest tier reached), `piecesPlacedTogether`, `questionsAnswered`, and `questionsSkipped`
- **`puzzleImages`** — puzzle image metadata (category, difficulty, image URL). The URL points at the image's copy in Firebase Storage (`puzzleImages/<imageId>.jpg`); the seed manifest keeps the original Unsplash URL as the source
- **`questions`** — tiered social-question content

Solo and cooperative sessions share one schema rather than separate tables, since both represent "someone completed a puzzle" with mostly-overlapping fields.

`puzzleImages`, `questions` and Storage images are read-only to the app — only the Admin SDK seed script can write them.

## Testing

```bash
cd BlindSide

# Unit tests only (no emulator or Java needed) — 68 tests
npm test

# Full Firestore emulator + unit test suite (adds the security-rules tests)
npm run test:firebase
```

Run a single suite with `npm run test:<name>`: `auth`, `models`, `jigsaw`, `jigsaw-board`, `catalog`, `cooperative-catalog`, `cooperative-turn`, `solo`, `solo-stats`.

Covers: authentication flow, registration transaction integrity, and username validation; Firestore security rules (unauthenticated denial, solo/cooperative session ownership and locked ownership fields, partner-only cooperative sessions, atomic username reservation, email-free profiles); the partner request flow (send, accept, decline, cancel, and forged-request rejection); account deletion; cooperative turn logic and tier escalation (including a full 48-piece game per tier with no repeated question); and jigsaw puzzle generation (deterministic piece layout, snap tolerance by difficulty).

## Design System

| Token | Value | Use |
|---|---|---|
| Midnight Navy | `#0F172A` | Primary background |
| Electric Blue | `#2563EB` | Primary interactive color |
| Neon Cyan | `#06B6D4` | Highlights, active states |
| Victory Gold | `#FACC15` | Achievement, solo-mode accent |

The app uses a dark interface throughout. Text uses two faded shades (`textSecondary` for supporting text, `textMuted` for hints and placeholders), with `error` and `danger` tokens for messages and destructive actions. Corners use a shared radius scale (`src/theme/radii.js`: 8, 12, 16, pill). Typography pairs Orbitron (display) with Poppins and Inter.

## Architecture Notes

- **Partner connection uses username search plus a request/accept step** — v1.0 connected players instantly, but that let anyone link themselves to any account they knew the username of. Since v1.1 the other player must accept from their own account. It's still a one-time step: once connected, starting a session together on the shared device needs no invite at all.
- **Screens reload-on-focus rather than using live Firestore listeners** — simpler and cheaper for this app's actual needs; nothing requires sub-second real-time sync.
- **Cooperative session creation is followed by an atomic write, not a preceding read** — an earlier version checked username/session validity via a pre-write read, which correctly failed against security rules requiring authentication. The fix moves validation into the same atomic transaction as the write itself.
- **Game logic is pure and framework-free** — turn state, question timing, tier escalation, stats and milestones are plain functions in `src/utils/`, so they're deterministic and unit-tested without a device.
- **Challenges are computed, not stored** — milestones are derived from session history each time, so they can't drift out of sync with what the player actually did.
- **Puzzle images are self-hosted** — sourced from Unsplash but copied into Firebase Storage by the seed script, so a photo removed from Unsplash can't break a puzzle.

## Known Limitations

- **Google sign-in needs a built app** — the native Google module isn't in Expo Go, so the button is hidden there. Use an EAS build (`npm run build:apk`) to test it.
- **Google and email accounts with the same address** — Firebase treats Google as the trusted owner of a Gmail address. If someone registered with email and password but never verified the address, signing in with Google takes over that account (same profile and history) and the old password stops working. They can use Forgot Password to set one again.
- **No iOS build** — only an Android APK is built. `app.json`'s Google `iosUrlScheme` is a placeholder (the reversed Web client ID) and must be replaced with an iOS client ID before any iPhone build. iPhone users can still run the app through Expo Go, without Google sign-in.
- **Cooperative play uses one size** — always the 48-piece layout, regardless of difficulty.
- **Web platform** — not supported; native dependencies prevent it from rendering correctly.

## Version History

Full details, security changes and per-release deployment steps are in [CHANGELOG.md](CHANGELOG.md).

### v1.4

- **New app icon (v1.4.1)** — the home-screen icon and splash now use the same cyan puzzle mark as the app's logo, and the icon is larger.
- **Sign in with Google** — Log In and Create Account now have a working Google button. First-time Google players choose a username before they start. Google sign-in works in the installed APK, not in Expo Go.
- **Download the APK** — [install BlindSide v1.4.1 on Android](https://expo.dev/accounts/marioojo/projects/BlindSide/builds/8f1815ca-def4-4cba-babb-d2a49ad3e2bb) (open the link on your phone).

### v1.3.2

- **Matching sign-in screens** — Create Account now looks like Log In, scrolls with the keyboard open, and has a show-password toggle. Placeholder text is faded so it no longer looks like typed text.

### v1.3.1

- **Google button removed** — the login screen no longer shows "Continue with Google", which was never wired up and only showed an error. Sign in with email and password. (Replaced by real Google sign-in in v1.4.)

### v1.3

- **36 puzzles** — 3 in every category at every difficulty, including new Cape Town scenes (Bo-Kaap, Table Mountain, Lion's Head).
- **Android APK** — BlindSide can now be installed directly on Android, without Expo Go. See [Building the Android APK](#building-the-android-apk).

### v1.2

- **24 puzzles, up from 16** — 8 new images, so every cooperative category now has 3 puzzles to choose from.
- **Textures category** — a fourth category (leaves, sprinkles, coffee beans, and more) in both solo and cooperative play.
- **Images hosted in Firebase Storage** — puzzle art is still sourced from Unsplash, but players now load BlindSide's own copy, so a photo removed from Unsplash can't break a puzzle.

### v1.1

- **Partner requests** — connecting now takes consent: send a request by username, and the other player accepts (or declines) from their own account.
- **Escalating questions** — the chosen tier is the deepest level reached; questions build up to it as the puzzle fills. Each tier has 20 questions (60 in total), so no question repeats within a game (v1.1.1).
- **Delete Account** — available on the Profile tab, confirmed with your password.
- **Move counter** — shown on the completion screens for solo and cooperative play.
- **Save warning** — a banner appears if autosave fails, so progress is never silently lost.
- **Privacy** — email addresses are no longer stored on public profiles or shown in partner search.
