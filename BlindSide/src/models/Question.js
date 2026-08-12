// Validates relationship-tier prompts before they are written to or read from Firestore.
const QUESTION_TIERS = new Set(['acquaintance', 'friendship', 'lover']);

export function buildQuestionDocument({ questionId, tier, text }) {
  if (!questionId || !QUESTION_TIERS.has(tier) || !text?.trim()) {
    throw new Error('Questions require an id, valid tier, and text.');
  }

  return { questionId, tier, text: text.trim() };
}