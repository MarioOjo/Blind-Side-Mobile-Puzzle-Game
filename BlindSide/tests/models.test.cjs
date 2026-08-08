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

const { buildQuestionDocument } = loadAppModule('src/models/Question.js');
const { buildSessionDocument } = loadAppModule('src/models/Session.js');
const {
  calculateCooperativeStats,
  formatRelativeTime,
  indexProfilesByUid,
  presentCooperativeSession,
} = loadAppModule('src/utils/cooperativeSessions.js');

test('session builder produces distinct solo and cooperative ownership shapes', () => {
  const solo = buildSessionDocument({
    mode: 'solo', userId: 'alice-id', puzzleId: 'puzzle-1', status: 'inProgress',
  });
  assert.equal(solo.userId, 'alice-id');
  assert.equal('partnerIds' in solo, false);

  const cooperative = buildSessionDocument({
    mode: 'cooperative',
    partnerIds: ['alice-id', 'bob-id'],
    puzzleId: 'puzzle-1',
    status: 'completed',
  });
  assert.deepEqual(cooperative.partnerIds, ['alice-id', 'bob-id']);
  assert.equal('userId' in cooperative, false);
  assert.equal(cooperative.piecesPlacedTogether, 0);
});

test('session builder rejects invalid ownership combinations', () => {
  assert.throws(() => buildSessionDocument({
    mode: 'solo', partnerIds: ['alice-id', 'bob-id'], puzzleId: 'puzzle-1', status: 'inProgress',
  }));
  assert.throws(() => buildSessionDocument({
    mode: 'cooperative',
    partnerIds: ['alice-id', 'alice-id'],
    puzzleId: 'puzzle-1',
    status: 'inProgress',
  }));
});

test('question builder accepts only supported relationship tiers', () => {
  assert.deepEqual(
    buildQuestionDocument({ questionId: 'q1', tier: 'friendship', text: '  A question?  ' }),
    { questionId: 'q1', tier: 'friendship', text: 'A question?' },
  );
  assert.throws(() => buildQuestionDocument({ questionId: 'q2', tier: 'team', text: 'No' }));
});

test('cooperative session presentation uses partner profiles and placed-piece progress', () => {
  const profiles = indexProfilesByUid([{ uid: 'bob-id', username: 'Bob' }]);
  const presented = presentCooperativeSession({
    id: 'session-1',
    partnerIds: ['alice-id', 'bob-id'],
    status: 'inProgress',
    piecesPlacedTogether: 3,
    createdAt: { toDate: () => new Date(1000) },
  }, 'alice-id', profiles, 3601000);

  assert.deepEqual(presented, {
    id: 'session-1',
    partnerName: 'Bob',
    status: 'inProgress',
    progressLabel: '3 pieces placed',
    lastPlayed: '1h ago',
  });
  assert.equal(formatRelativeTime(null), 'Recently');
});

test('cooperative statistics use completed sessions and distinct actual partners', () => {
  const stats = calculateCooperativeStats([
    { partnerIds: ['alice-id', 'bob-id'], status: 'completed', piecesPlacedTogether: 5 },
    { partnerIds: ['alice-id', 'bob-id'], status: 'inProgress', piecesPlacedTogether: 2 },
    { partnerIds: ['carol-id', 'alice-id'], status: 'completed', piecesPlacedTogether: 4 },
  ], 'alice-id');

  assert.deepEqual(stats, {
    completedSessions: 2,
    partnersPlayedWith: 2,
    piecesPlacedTogether: 11,
  });
});