// Covers Firestore model builders, seed schemas, and cooperative-session presentation helpers.
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
const { buildPuzzleImageDocument } = loadAppModule('src/models/PuzzleImage.js');
const { buildSessionDocument } = loadAppModule('src/models/Session.js');
const { buildUserDocument, isValidUsername } = loadAppModule('src/models/User.js');
const { puzzleImages, questions } = require('../scripts/firestore-seed-manifest.cjs');
const {
  calculateCooperativeStats,
  formatRelativeTime,
  indexProfilesByUid,
  presentCooperativeSession,
} = loadAppModule('src/utils/cooperativeSessions.js');
const { presentSoloSession } = loadAppModule('src/utils/soloSessions.js');

test('session builder produces distinct solo and cooperative ownership shapes', () => {
  const solo = buildSessionDocument({
    mode: 'solo',
    userId: 'alice-id',
    puzzleId: 'puzzle-1',
    difficulty: 'easy',
    category: 'places',
    status: 'inProgress',
  });
  assert.equal(solo.userId, 'alice-id');
  assert.equal(solo.difficulty, 'easy');
  assert.equal(solo.category, 'places');
  assert.deepEqual(solo.placedPieceIds, []);
  assert.equal('partnerIds' in solo, false);

  const cooperative = buildSessionDocument({
    mode: 'cooperative',
    partnerIds: ['alice-id', 'bob-id'],
    puzzleId: 'puzzle-1',
    tier: 'friendship',
    status: 'completed',
  });
  assert.deepEqual(cooperative.partnerIds, ['alice-id', 'bob-id']);
  assert.equal(cooperative.tier, 'friendship');
  assert.equal(cooperative.turnCount, 0);
  assert.equal('userId' in cooperative, false);
  assert.equal(cooperative.piecesPlacedTogether, 0);
});

test('session builder rejects invalid ownership combinations', () => {
  assert.throws(() => buildSessionDocument({
    mode: 'solo',
    partnerIds: ['alice-id', 'bob-id'],
    puzzleId: 'puzzle-1',
    difficulty: 'easy',
    category: 'places',
    status: 'inProgress',
  }));
  assert.throws(() => buildSessionDocument({
    mode: 'solo', userId: 'alice-id', puzzleId: 'puzzle-1', status: 'completed',
  }));
  assert.throws(() => buildSessionDocument({
    mode: 'cooperative',
    partnerIds: ['alice-id', 'alice-id'],
    puzzleId: 'puzzle-1',
    tier: 'friendship',
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

test('gameplay seed manifest matches puzzle and question schemas', () => {
  assert.equal(puzzleImages.length, 36);
  assert.equal(questions.length, 60);
  assert.equal(new Set(puzzleImages.map(({ imageId }) => imageId)).size, 36);
  assert.equal(new Set(questions.map(({ questionId }) => questionId)).size, 60);
  assert.equal(new Set(questions.map(({ text }) => text.toLowerCase())).size, 60);

  assert.deepEqual(
    puzzleImages.map(({ imageId }) => imageId).sort(),
    [
      'characters-astronaut',
      'characters-bird-mural',
      'characters-graffiti-monsters',
      'characters-mosaic-mural',
      'characters-narwhal',
      'characters-nesting-dolls',
      'characters-retro-robot',
      'characters-swirly-monster',
      'characters-tin-robot',
      'people-bright-smile',
      'people-carnival-dancers',
      'people-colorful-portrait',
      'people-elderly-portrait',
      'people-fabric-market',
      'people-holi-festival',
      'people-knitted-beanie',
      'people-maya',
      'people-outdoor-portrait',
      'places-bo-kaap',
      'places-burano',
      'places-hot-air-balloons',
      'places-lions-head',
      'places-machu-picchu',
      'places-marrakech-market',
      'places-santorini',
      'places-table-mountain',
      'places-venice-canal',
      'textures-autumn-leaves',
      'textures-beach-pebbles',
      'textures-brick-wall',
      'textures-candy-sprinkles',
      'textures-citrus-slices',
      'textures-coffee-beans',
      'textures-paint-swirl',
      'textures-rainbow-pencils',
      'textures-yarn-wall',
    ],
  );
  assert.deepEqual(
    [...new Set(puzzleImages.map(({ category }) => category))].sort(),
    ['characters', 'people', 'places', 'textures'],
  );
  const imagesById = Object.fromEntries(puzzleImages.map((image) => [image.imageId, image]));
  assert.equal(imagesById['people-maya'].difficultyRecommended, 'easy');
  assert.equal(imagesById['places-santorini'].difficultyRecommended, 'easy');
  assert.equal(imagesById['characters-astronaut'].difficultyRecommended, 'easy');
  assert.equal(imagesById['textures-brick-wall'].difficultyRecommended, 'medium');
  assert.equal(imagesById['textures-coffee-beans'].difficultyRecommended, 'hard');
  assert.equal(imagesById['people-colorful-portrait'].difficultyRecommended, 'hard');
  assert.equal(imagesById['places-machu-picchu'].difficultyRecommended, 'medium');
  assert.equal(imagesById['places-venice-canal'].difficultyRecommended, 'medium');
  assert.equal(imagesById['places-marrakech-market'].difficultyRecommended, 'hard');
  assert.equal(imagesById['characters-retro-robot'].difficultyRecommended, 'easy');
  assert.equal(imagesById['characters-swirly-monster'].difficultyRecommended, 'medium');
  assert.equal(imagesById['characters-narwhal'].difficultyRecommended, 'easy');
  assert.equal(imagesById['people-outdoor-portrait'].difficultyRecommended, 'medium');
  assert.equal(imagesById['people-elderly-portrait'].difficultyRecommended, 'medium');
  assert.equal(imagesById['characters-mosaic-mural'].difficultyRecommended, 'hard');
  assert.equal(imagesById['characters-bird-mural'].difficultyRecommended, 'hard');
  for (const imageId of [
    'characters-graffiti-monsters', 'people-holi-festival', 'people-carnival-dancers', 'places-burano',
    'places-hot-air-balloons', 'textures-autumn-leaves', 'textures-candy-sprinkles',
  ]) {
    assert.equal(imagesById[imageId].difficultyRecommended, 'hard');
  }
  assert.equal(imagesById['textures-paint-swirl'].difficultyRecommended, 'easy');
  for (const imageId of [
    'people-bright-smile', 'people-knitted-beanie', 'places-bo-kaap', 'places-table-mountain',
    'textures-rainbow-pencils', 'textures-citrus-slices',
  ]) {
    assert.equal(imagesById[imageId].difficultyRecommended, 'easy');
  }
  for (const imageId of [
    'characters-tin-robot', 'characters-nesting-dolls', 'people-fabric-market', 'places-lions-head',
    'textures-beach-pebbles', 'textures-yarn-wall',
  ]) {
    assert.equal(imagesById[imageId].difficultyRecommended, 'medium');
  }
  puzzleImages.forEach((image) => {
    assert.deepEqual(buildPuzzleImageDocument(image), image);
    assert.deepEqual(
      Object.keys(image).sort(),
      ['category', 'difficultyRecommended', 'imageId', 'imageName', 'imageURL'],
    );
    const imageUrl = new URL(image.imageURL);
    assert.equal(imageUrl.protocol, 'https:');
    assert.equal(imageUrl.hostname, 'images.unsplash.com');
    // /photo- for standard Unsplash photographs, /vector- for its free
    // illustration assets (the Characters category's non-photorealistic
    // entries) — both permanently accepted, not scoped to this batch.
    assert.match(imageUrl.pathname, /^\/(photo|vector)-[\w-]+$/);
  });

  const tierCounts = questions.reduce((counts, question) => ({
    ...counts,
    [question.tier]: (counts[question.tier] ?? 0) + 1,
  }), {});
  assert.deepEqual(tierCounts, { acquaintance: 20, friendship: 20, lover: 20 });
  questions.forEach((question) => {
    assert.deepEqual(buildQuestionDocument(question), question);
    assert.deepEqual(Object.keys(question).sort(), ['questionId', 'text', 'tier']);
    assert.ok(question.text.length > 10);
  });

  const prompts = new Set(questions.map(({ text }) => text));
  assert.ok(prompts.has('What do you do for work?'));
  assert.ok(prompts.has("What's your go-to comfort food?"));
  assert.ok(prompts.has('What song reminds you of me?'));
});

test('cooperative session presentation uses partner profiles and placed-piece progress', () => {
  const profiles = indexProfilesByUid([{ uid: 'bob-id', username: 'Bob' }]);
  const presented = presentCooperativeSession({
    id: 'session-1',
    partnerIds: ['alice-id', 'bob-id'],
    status: 'inProgress',
    piecesPlacedTogether: 3,
    tier: 'friendship',
    puzzleId: 'puzzle-1',
    createdAt: { toDate: () => new Date(1000) },
  }, 'alice-id', profiles, 3601000);

  assert.deepEqual(presented, {
    id: 'session-1',
    partnerId: 'bob-id',
    tier: 'friendship',
    puzzleId: 'puzzle-1',
    partnerName: 'Bob',
    status: 'inProgress',
    progressLabel: '3 pieces placed',
    lastPlayed: '1h ago',
  });
  assert.equal(formatRelativeTime(null), 'Recently');
});

test('solo session presentation labels by mode and shows placed-piece progress', () => {
  const inProgress = presentSoloSession({
    id: 'solo-session-1',
    puzzleId: 'puzzle-1',
    status: 'inProgress',
    placedPieceIds: ['piece-0-0', 'piece-0-1'],
    createdAt: { toDate: () => new Date(1000) },
  }, 3601000);

  assert.deepEqual(inProgress, {
    id: 'solo-session-1',
    mode: 'solo',
    puzzleId: 'puzzle-1',
    partnerName: 'Solo',
    status: 'inProgress',
    statusLabel: 'In progress',
    progressLabel: '2 pieces placed',
    lastPlayed: '1h ago',
  });

  const completed = presentSoloSession({
    id: 'solo-session-2',
    puzzleId: 'puzzle-1',
    status: 'completed',
    placedPieceIds: ['piece-0-0'],
    createdAt: null,
  });
  assert.equal(completed.statusLabel, 'Completed');
  assert.equal(completed.progressLabel, 'Complete');
});

test('cooperative statistics use completed sessions and distinct actual partners', () => {
  const stats = calculateCooperativeStats([
    {
      partnerIds: ['alice-id', 'bob-id'],
      status: 'completed',
      piecesPlacedTogether: 5,
      questionsAnswered: 1,
      questionsSkipped: 1,
    },
    // In-progress question counts are excluded until the puzzle is finished.
    {
      partnerIds: ['alice-id', 'bob-id'],
      status: 'inProgress',
      piecesPlacedTogether: 2,
      questionsAnswered: 5,
      questionsSkipped: 5,
    },
    { partnerIds: ['carol-id', 'alice-id'], status: 'completed', piecesPlacedTogether: 4, questionsAnswered: 2 },
  ], 'alice-id');

  assert.deepEqual(stats, {
    completedSessions: 2,
    partnersPlayedWith: 2,
    piecesPlacedTogether: 11,
    questionsAnswered: 3,
    questionsSkipped: 1,
  });
});

test('user profiles never store the email address', () => {
  const profile = buildUserDocument({ uid: 'alice-id', username: ' Alice_01 ' });
  assert.equal(profile.username, 'Alice_01');
  assert.equal(profile.usernameLower, 'alice_01');
  assert.equal('email' in profile, false);
});

test('usernames must be 3-20 letters, numbers, underscores, or periods', () => {
  ['abc', 'Alice_01', 'mario.ojo', 'a'.repeat(20)].forEach((name) => {
    assert.equal(isValidUsername(name), true, name);
  });
  ['ab', 'a'.repeat(21), 'has space', 'emoji😀', 'semi;colon', ''].forEach((name) => {
    assert.equal(isValidUsername(name), false, name);
  });
  assert.throws(() => buildUserDocument({ uid: 'alice-id', username: 'no spaces' }));
});
