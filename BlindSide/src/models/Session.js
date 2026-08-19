// Enforces distinct solo/cooperative session ownership and builds canonical Firestore records.
import { serverTimestamp } from 'firebase/firestore';

const SESSION_MODES = new Set(['solo', 'cooperative']);
const SESSION_STATUSES = new Set(['inProgress', 'completed', 'abandoned']);

export function validateSession(input) {
  if (!SESSION_MODES.has(input.mode)) {
    throw new Error('Session mode must be solo or cooperative.');
  }

  if (!SESSION_STATUSES.has(input.status)) {
    throw new Error('Session status is invalid.');
  }

  if (!input.puzzleId) {
    throw new Error('Sessions require a puzzleId.');
  }

  if (
    input.mode === 'solo'
    && (!input.userId || input.partnerIds || !input.difficulty || !input.category)
  ) {
    throw new Error('Solo sessions require userId, difficulty, category, and no partnerIds.');
  }

  if (
    input.mode === 'cooperative'
    && (
      input.userId
      || !Array.isArray(input.partnerIds)
      || input.partnerIds.length !== 2
      || new Set(input.partnerIds).size !== 2
      || !input.tier
    )
  ) {
    throw new Error('Cooperative sessions require two distinct partnerIds, a tier, and no userId.');
  }
}

export function buildSessionDocument(input) {
  validateSession(input);

  const document = {
    mode: input.mode,
    puzzleId: input.puzzleId,
    status: input.status,
    completionTime: input.completionTime ?? null,
    completedAt: input.completedAt ?? null,
    movesTaken: input.movesTaken ?? 0,
    createdAt: serverTimestamp(),
  };

  if (input.mode === 'solo') {
    return {
      ...document,
      userId: input.userId,
      difficulty: input.difficulty,
      category: input.category,
      // IDs of pieces confirmed placed, so an in-progress solo session can be
      // resumed by pre-marking these as placed on the board — mirrors the
      // cooperative session's placedPieceIds field.
      placedPieceIds: input.placedPieceIds ?? [],
    };
  }

  return {
    ...document,
    partnerIds: input.partnerIds,
    tier: input.tier,
    turnCount: input.turnCount ?? 0,
    piecesPlacedTogether: input.piecesPlacedTogether ?? 0,
    // IDs of pieces confirmed placed (e.g. "piece-2-5"), so an in-progress
    // session can be resumed by pre-marking these as placed on the board
    // instead of only knowing how many pieces were placed. currentPlayerIndex
    // is deliberately not stored here: it toggles once per completed turn in
    // lockstep with turnCount (see cooperativeTurn.js), so turnCount % 2
    // already reconstructs it.
    placedPieceIds: input.placedPieceIds ?? [],
    questionsAnswered: input.questionsAnswered ?? 0,
    questionsSkipped: input.questionsSkipped ?? 0,
  };
}