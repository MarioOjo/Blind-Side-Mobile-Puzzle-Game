# Changelog

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
