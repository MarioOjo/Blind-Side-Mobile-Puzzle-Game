// Pure turn-loop logic for single-device cooperative play.
// No UI, no Firestore — all state is plain objects that PuzzleScreen owns.
//
// Phase flow driven by PuzzleScreen:
//   'confirming' → (current player taps) → null (board active)
//   correct placement, no question → advancePlayer → 'confirming'
//   correct placement, question due → 'question' → (both confirm OR skip) → advancePlayer → 'confirming'
//   final placement → 'complete' (no question, no confirm step)

const QUESTION_INTERVAL = 3;

// Relationship tiers from lightest to deepest. The tier a pair picks is the
// deepest they're comfortable with; questions climb toward it as the puzzle fills.
export const TIER_ORDER = ['acquaintance', 'friendship', 'lover'];

// Returns the tiers a session can draw from, lightest first, ending at maxTier.
export function getTiersUpTo(maxTier) {
  const maxIndex = TIER_ORDER.indexOf(maxTier);
  return maxIndex === -1 ? [] : TIER_ORDER.slice(0, maxIndex + 1);
}

// Splits the puzzle into equal stages, one per unlocked tier: with "lover" picked,
// the first third asks acquaintance questions, the middle third friendship, and the
// final third lover. Unknown tiers or piece counts fall back to maxTier itself.
export function getTierForProgress(placedCount, totalPieces, maxTier) {
  const tiers = getTiersUpTo(maxTier);
  if (!tiers.length || !totalPieces || totalPieces <= 0) return maxTier;
  const progress = Math.min(Math.max(placedCount / totalPieces, 0), 1);
  return tiers[Math.min(Math.floor(progress * tiers.length), tiers.length - 1)];
}

export function buildTurnState(partnerAName, partnerBName) {
  return {
    partnerNames: [partnerAName, partnerBName],
    currentPlayerIndex: 0,
    placedCount: 0,
    turnCount: 0,
    questionPool: [],
    questionPoolOffset: 0,
    questionPoolKey: null,
    activeQuestion: null,
    questionConfirmedBy: [],
    questionsAnswered: 0,
    questionsSkipped: 0,
  };
}

// Fisher-Yates shuffle — returns a new array, never mutates.
export function shufflePool(items) {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

// Returns the next question from the pool, reshuffling and cycling when exhausted.
// `allQuestions` is the full unshuffled list fetched from Firestore. `poolKey`
// identifies which list it is (e.g. a tier) so moving to a new tier starts a fresh pool.
function pickNextQuestion(state, allQuestions, poolKey) {
  if (!allQuestions.length) return { question: null, nextPool: [], nextOffset: 0 };

  let { questionPool, questionPoolOffset } = state;

  if (questionPoolOffset >= questionPool.length || (state.questionPoolKey ?? null) !== poolKey) {
    questionPool = shufflePool(allQuestions);
    questionPoolOffset = 0;
  }

  const question = questionPool[questionPoolOffset];
  return {
    question,
    nextPool: questionPool,
    nextOffset: questionPoolOffset + 1,
  };
}

// Returns the next full turn state after a correct placement.
// `allQuestions` — full question list for this tier (may be empty).
// `isFinalPlacement` — caller must pass true when placedCount + 1 === totalPieces.
// `poolKey` — optional label for `allQuestions` (the tier); a change reshuffles the pool.
export function recordCorrectPlacement(state, allQuestions, isFinalPlacement, poolKey = null) {
  const nextPlacedCount = state.placedCount + 1;
  const nextTurnCount = state.turnCount + 1;
  const questionDue = !isFinalPlacement && nextPlacedCount % QUESTION_INTERVAL === 0;

  let activeQuestion = null;
  let nextPool = state.questionPool;
  let nextOffset = state.questionPoolOffset;
  let nextPoolKey = state.questionPoolKey ?? null;

  if (questionDue) {
    const picked = pickNextQuestion(state, allQuestions, poolKey);
    activeQuestion = picked.question;
    nextPool = picked.nextPool;
    nextOffset = picked.nextOffset;
    nextPoolKey = poolKey;
  }

  return {
    ...state,
    placedCount: nextPlacedCount,
    turnCount: nextTurnCount,
    questionPool: nextPool,
    questionPoolOffset: nextOffset,
    questionPoolKey: nextPoolKey,
    activeQuestion,
    questionConfirmedBy: [],
  };
}

// Returns updated state after one partner taps their confirmation button.
// `playerIndex` is 0 or 1.
export function confirmQuestion(state, playerIndex) {
  if (state.questionConfirmedBy.includes(playerIndex)) return state;
  return {
    ...state,
    questionConfirmedBy: [...state.questionConfirmedBy, playerIndex],
  };
}

// True once both partners have tapped their confirmation.
export function isQuestionFullyConfirmed(state) {
  return state.questionConfirmedBy.length === 2;
}

// Skips the active question without requiring both players to confirm.
// Increments questionsSkipped and advances to the next player.
// Call this immediately before entering the 'confirming' phase.
export function skipQuestion(state) {
  return {
    ...state,
    currentPlayerIndex: state.currentPlayerIndex === 0 ? 1 : 0,
    activeQuestion: null,
    questionConfirmedBy: [],
    questionsSkipped: state.questionsSkipped + 1,
  };
}

// Advances to the next player and clears question state.
// Increments questionsAnswered. Call immediately before entering the 'confirming' phase.
export function advancePlayer(state) {
  return {
    ...state,
    currentPlayerIndex: state.currentPlayerIndex === 0 ? 1 : 0,
    activeQuestion: null,
    questionConfirmedBy: [],
    questionsAnswered: state.questionsAnswered + (state.activeQuestion !== null ? 1 : 0),
  };
}
