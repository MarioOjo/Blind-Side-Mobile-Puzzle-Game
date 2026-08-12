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

  if (input.mode === 'solo' && (!input.userId || input.partnerIds)) {
    throw new Error('Solo sessions require userId and cannot include partnerIds.');
  }

  if (
    input.mode === 'cooperative'
    && (
      input.userId
      || !Array.isArray(input.partnerIds)
      || input.partnerIds.length !== 2
      || new Set(input.partnerIds).size !== 2
    )
  ) {
    throw new Error('Cooperative sessions require two distinct partnerIds and no userId.');
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
    return { ...document, userId: input.userId };
  }

  return {
    ...document,
    partnerIds: input.partnerIds,
    piecesPlacedTogether: input.piecesPlacedTogether ?? 0,
    questionsAnswered: input.questionsAnswered ?? 0,
  };
}