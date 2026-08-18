// Covers all six exported functions of cooperativeTurn.js: buildTurnState, shufflePool,
// recordCorrectPlacement, confirmQuestion, isQuestionFullyConfirmed, and advancePlayer.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const { transformSync } = require('@babel/core');

function loadAppModule(relativePath) {
  const filename = path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const { code } = transformSync(source, {
    filename,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const loadedModule = { exports: {} };
  const execute = new Function('require', 'module', 'exports', '__filename', '__dirname', code);
  execute(createRequire(filename), loadedModule, loadedModule.exports, filename, path.dirname(filename));
  return loadedModule.exports;
}

const {
  advancePlayer,
  buildTurnState,
  confirmQuestion,
  isQuestionFullyConfirmed,
  recordCorrectPlacement,
  shufflePool,
  skipQuestion,
} = loadAppModule('src/utils/cooperativeTurn.js');

const QUESTIONS = [
  { id: 'q1', text: 'Question one' },
  { id: 'q2', text: 'Question two' },
  { id: 'q3', text: 'Question three' },
  { id: 'q4', text: 'Question four' },
];

test('buildTurnState produces correct initial shape for both players', () => {
  const state = buildTurnState('Alice', 'Bob');
  assert.deepEqual(state, {
    partnerNames: ['Alice', 'Bob'],
    currentPlayerIndex: 0,
    placedCount: 0,
    turnCount: 0,
    questionPool: [],
    questionPoolOffset: 0,
    activeQuestion: null,
    questionConfirmedBy: [],
    questionsAnswered: 0,
    questionsSkipped: 0,
  });
  // Names are stored exactly as provided.
  const state2 = buildTurnState('Player 1', 'Player 2');
  assert.deepEqual(state2.partnerNames, ['Player 1', 'Player 2']);
});

test('shufflePool returns all items in a new array without mutating the original', () => {
  const original = [1, 2, 3, 4, 5, 6, 7, 8];
  const copy = [...original];
  const shuffled = shufflePool(original);

  // Original is not mutated.
  assert.deepEqual(original, copy);
  // Result contains exactly the same elements.
  assert.deepEqual([...shuffled].sort((a, b) => a - b), original);
  // Result is a different array reference.
  assert.notEqual(shuffled, original);
});

test('shufflePool on an empty array returns an empty array', () => {
  assert.deepEqual(shufflePool([]), []);
});

test('shufflePool on a single-element array returns that element', () => {
  assert.deepEqual(shufflePool(['only']), ['only']);
});

test('recordCorrectPlacement increments placedCount and turnCount on every call', () => {
  const state = buildTurnState('Alice', 'Bob');
  const next = recordCorrectPlacement(state, [], false);
  assert.equal(next.placedCount, 1);
  assert.equal(next.turnCount, 1);
  // Immutable — original state is unchanged.
  assert.equal(state.placedCount, 0);
  assert.equal(state.turnCount, 0);
});

test('recordCorrectPlacement clears questionConfirmedBy on every placement', () => {
  let state = buildTurnState('Alice', 'Bob');
  state = confirmQuestion(state, 0);
  state = confirmQuestion(state, 1);
  assert.equal(state.questionConfirmedBy.length, 2);

  const next = recordCorrectPlacement(state, [], false);
  assert.deepEqual(next.questionConfirmedBy, []);
});

test('recordCorrectPlacement raises a question every third placement', () => {
  let state = buildTurnState('Alice', 'Bob');

  // Placements 1 and 2 — no question.
  state = recordCorrectPlacement(state, QUESTIONS, false);
  assert.equal(state.activeQuestion, null);
  state = recordCorrectPlacement(state, QUESTIONS, false);
  assert.equal(state.activeQuestion, null);

  // Placement 3 — question due.
  state = recordCorrectPlacement(state, QUESTIONS, false);
  assert.notEqual(state.activeQuestion, null);
  assert.ok(QUESTIONS.some(({ id }) => id === state.activeQuestion.id));
  assert.equal(state.questionPoolOffset, 1);
});

test('recordCorrectPlacement does not raise a question on the final placement', () => {
  let state = buildTurnState('Alice', 'Bob');
  // Advance to placement 2 so the next would normally trigger a question at 3.
  state = recordCorrectPlacement(state, QUESTIONS, false);
  state = recordCorrectPlacement(state, QUESTIONS, false);

  // Placement 3 marked as final — no question should appear.
  const final = recordCorrectPlacement(state, QUESTIONS, true);
  assert.equal(final.activeQuestion, null);
  assert.equal(final.placedCount, 3);
});

test('recordCorrectPlacement with no questions never sets activeQuestion', () => {
  let state = buildTurnState('Alice', 'Bob');
  for (let i = 0; i < 6; i += 1) {
    state = recordCorrectPlacement(state, [], false);
  }
  assert.equal(state.activeQuestion, null);
  assert.equal(state.placedCount, 6);
});

test('question pool cycles and reshuffles when exhausted', () => {
  const twoQuestions = [{ id: 'q1' }, { id: 'q2' }];
  let state = buildTurnState('Alice', 'Bob');

  // Trigger first question at placement 3.
  state = recordCorrectPlacement(state, twoQuestions, false);
  state = recordCorrectPlacement(state, twoQuestions, false);
  state = recordCorrectPlacement(state, twoQuestions, false);
  assert.equal(state.questionPoolOffset, 1);
  const firstQuestion = state.activeQuestion;

  // Trigger second question at placement 6 — pool still has one remaining.
  state = recordCorrectPlacement(state, twoQuestions, false);
  state = recordCorrectPlacement(state, twoQuestions, false);
  state = recordCorrectPlacement(state, twoQuestions, false);
  assert.equal(state.questionPoolOffset, 2);

  // Trigger third question at placement 9 — pool is exhausted, must reshuffle.
  state = recordCorrectPlacement(state, twoQuestions, false);
  state = recordCorrectPlacement(state, twoQuestions, false);
  state = recordCorrectPlacement(state, twoQuestions, false);
  // After reshuffle the offset resets to 1 (one item consumed from the new pool).
  assert.equal(state.questionPoolOffset, 1);
  assert.notEqual(state.activeQuestion, null);
  // The question drawn is still from the known set.
  assert.ok(twoQuestions.some(({ id }) => id === state.activeQuestion.id));
  // Suppress unused-variable lint — firstQuestion is intentionally captured for the assertion above.
  void firstQuestion;
});

test('confirmQuestion records each player index once and is idempotent', () => {
  const state = buildTurnState('Alice', 'Bob');

  const after0 = confirmQuestion(state, 0);
  assert.deepEqual(after0.questionConfirmedBy, [0]);

  // Confirming the same player again returns the same state (no duplicate).
  const after0Again = confirmQuestion(after0, 0);
  assert.deepEqual(after0Again.questionConfirmedBy, [0]);
  assert.equal(after0Again, after0); // same reference — no new object created

  const after1 = confirmQuestion(after0, 1);
  assert.deepEqual(after1.questionConfirmedBy, [0, 1]);

  // Original state is not mutated.
  assert.deepEqual(state.questionConfirmedBy, []);
});

test('isQuestionFullyConfirmed requires both players to have confirmed', () => {
  const state = buildTurnState('Alice', 'Bob');
  assert.equal(isQuestionFullyConfirmed(state), false);

  const one = confirmQuestion(state, 0);
  assert.equal(isQuestionFullyConfirmed(one), false);

  const both = confirmQuestion(one, 1);
  assert.equal(isQuestionFullyConfirmed(both), true);
});

test('advancePlayer increments questionsAnswered when a question was active', () => {
  let state = buildTurnState('Alice', 'Bob');
  state = { ...state, activeQuestion: QUESTIONS[0] };
  const advanced = advancePlayer(state);
  assert.equal(advanced.questionsAnswered, 1);
  assert.equal(advanced.questionsSkipped, 0);

  // No question active — questionsAnswered stays the same.
  const advancedNoQ = advancePlayer(advanced);
  assert.equal(advancedNoQ.questionsAnswered, 1);
});

test('skipQuestion increments questionsSkipped, advances player, clears question state', () => {
  let state = buildTurnState('Alice', 'Bob');
  state = { ...state, activeQuestion: QUESTIONS[0], questionConfirmedBy: [0] };
  assert.equal(state.currentPlayerIndex, 0);

  const skipped = skipQuestion(state);
  assert.equal(skipped.currentPlayerIndex, 1);
  assert.equal(skipped.activeQuestion, null);
  assert.deepEqual(skipped.questionConfirmedBy, []);
  assert.equal(skipped.questionsSkipped, 1);
  assert.equal(skipped.questionsAnswered, 0);

  // Original state is not mutated.
  assert.equal(state.questionsSkipped, 0);
  assert.notEqual(state.activeQuestion, null);
});

test('skipQuestion toggles player index correctly on second skip', () => {
  let state = buildTurnState('Alice', 'Bob');
  state = { ...state, activeQuestion: QUESTIONS[0] };
  state = skipQuestion(state); // player 0 → 1
  state = { ...state, activeQuestion: QUESTIONS[1] };
  state = skipQuestion(state); // player 1 → 0
  assert.equal(state.currentPlayerIndex, 0);
  assert.equal(state.questionsSkipped, 2);
});

test('advancePlayer toggles currentPlayerIndex and clears question state', () => {
  let state = buildTurnState('Alice', 'Bob');
  assert.equal(state.currentPlayerIndex, 0);

  // Simulate a question being active.
  state = { ...state, activeQuestion: QUESTIONS[0], questionConfirmedBy: [0, 1] };

  const advanced = advancePlayer(state);
  assert.equal(advanced.currentPlayerIndex, 1);
  assert.equal(advanced.activeQuestion, null);
  assert.deepEqual(advanced.questionConfirmedBy, []);

  // Toggle back to player 0.
  const back = advancePlayer(advanced);
  assert.equal(back.currentPlayerIndex, 0);

  // Original state is not mutated.
  assert.equal(state.currentPlayerIndex, 0);
  assert.notEqual(state.activeQuestion, null);
});

test('full turn loop: three placements trigger question, both confirm, player advances', () => {
  let state = buildTurnState('Alice', 'Bob');

  state = recordCorrectPlacement(state, QUESTIONS, false);
  state = recordCorrectPlacement(state, QUESTIONS, false);
  // Third placement — question raised.
  state = recordCorrectPlacement(state, QUESTIONS, false);
  assert.notEqual(state.activeQuestion, null);
  assert.equal(isQuestionFullyConfirmed(state), false);

  // Both players confirm.
  state = confirmQuestion(state, 0);
  assert.equal(isQuestionFullyConfirmed(state), false);
  state = confirmQuestion(state, 1);
  assert.equal(isQuestionFullyConfirmed(state), true);

  // Question fully confirmed — advance to next player before entering 'confirming'.
  state = advancePlayer(state);
  assert.equal(state.currentPlayerIndex, 1);
  assert.equal(state.activeQuestion, null);
  assert.deepEqual(state.questionConfirmedBy, []);
  assert.equal(state.placedCount, 3);
  assert.equal(state.turnCount, 3);
});

test('non-question placement advances player immediately before confirming phase', () => {
  let state = buildTurnState('Alice', 'Bob');
  assert.equal(state.currentPlayerIndex, 0);

  // Two placements — no question due, each ends the turn immediately.
  state = recordCorrectPlacement(state, QUESTIONS, false);
  // PuzzleScreen calls advancePlayer right here before setTurnPhase('confirming').
  state = advancePlayer(state);
  assert.equal(state.currentPlayerIndex, 1);

  state = recordCorrectPlacement(state, QUESTIONS, false);
  state = advancePlayer(state);
  assert.equal(state.currentPlayerIndex, 0);

  // Third placement triggers a question — player does NOT advance yet.
  state = recordCorrectPlacement(state, QUESTIONS, false);
  assert.notEqual(state.activeQuestion, null);
  assert.equal(state.currentPlayerIndex, 0); // still player 0 until both confirm
});

test('turn 1 and subsequent turns are symmetric: buildTurnState starts at player 0 ready to confirm', () => {
  const state = buildTurnState('Alice', 'Bob');
  // Player 0 is current from the start — the 'confirming' phase shows Alice immediately.
  assert.equal(state.currentPlayerIndex, 0);
  assert.equal(state.activeQuestion, null);
  assert.deepEqual(state.questionConfirmedBy, []);
  // After Alice confirms receipt (PuzzleScreen sets phase null), she plays.
  // After her placement, advancePlayer is called — Bob becomes current for 'confirming'.
  const afterAdvance = advancePlayer(state);
  assert.equal(afterAdvance.currentPlayerIndex, 1);
});
