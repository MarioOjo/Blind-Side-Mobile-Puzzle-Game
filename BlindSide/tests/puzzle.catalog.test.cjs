// Verifies puzzle-selection filtering, option visibility, ordering, and route branching.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const { transformSync } = require('@babel/core');
const { puzzleImages } = require('../scripts/firestore-seed-manifest.cjs');

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
  getAvailableCategories,
  getAvailableDifficulties,
  getCategoryRoute,
  getPuzzlesForSelection,
} = loadAppModule('src/utils/puzzleCatalog.js');

test('fixed difficulties and categories remain visible with real counts', () => {
  assert.deepEqual(
    getAvailableDifficulties(puzzleImages).map(({ key, count }) => ({ key, count })),
    [
      { key: 'easy', count: 5 },
      { key: 'medium', count: 6 },
      { key: 'hard', count: 5 },
    ],
  );
  assert.deepEqual(
    getAvailableCategories(puzzleImages, 'easy').map(({ key, count }) => ({ key, count })),
    [
      { key: 'characters', count: 3 },
      { key: 'people', count: 1 },
      { key: 'places', count: 1 },
    ],
  );
  assert.deepEqual(
    getAvailableCategories(puzzleImages, 'medium').map(({ key, count }) => ({ key, count })),
    [
      { key: 'characters', count: 1 },
      { key: 'people', count: 2 },
      { key: 'places', count: 2 },
    ],
  );
  assert.deepEqual(
    getAvailableCategories(puzzleImages, 'hard').map(({ key, count }) => ({ key, count })),
    [
      { key: 'characters', count: 2 },
      { key: 'people', count: 1 },
      { key: 'places', count: 1 },
    ],
  );
});

test('catalog filtering is normalized, deterministic, and safe for malformed input', () => {
  assert.deepEqual(
    getPuzzlesForSelection(puzzleImages, { difficulty: ' EASY ', category: 'PLACES' })
      .map(({ imageId }) => imageId),
    ['places-santorini'],
  );
  assert.deepEqual(
    getAvailableDifficulties([]).map(({ key, count }) => ({ key, count })),
    [
      { key: 'easy', count: 0 },
      { key: 'medium', count: 0 },
      { key: 'hard', count: 0 },
    ],
  );
  assert.deepEqual(
    getAvailableCategories(null, 'easy').map(({ key, count }) => ({ key, count })),
    [
      { key: 'characters', count: 0 },
      { key: 'people', count: 0 },
      { key: 'places', count: 0 },
    ],
  );
  assert.deepEqual(getPuzzlesForSelection([null, {}, ...puzzleImages], { difficulty: 'hard' })
    .map(({ imageId }) => imageId), [
    'characters-bird-mural',
    'textures-coffee-beans',
    'characters-mosaic-mural',
    'places-marrakech-market',
    'people-colorful-portrait',
  ]);
});

test('category routing shows empty state and preserves populated branches', () => {
  // Every real category x difficulty combination among the 3 selectable
  // categories now has at least one match (hard/characters gained 2 here),
  // so 'textures' — a valid schema category, just excluded from the
  // selectable CATEGORY_OPTIONS UI — is the only remaining way to
  // demonstrate a genuine empty state with real manifest data.
  assert.deepEqual(getCategoryRoute(puzzleImages, 'easy', 'textures'), {
    screen: 'PuzzleSelection',
    params: { difficulty: 'easy', category: 'textures' },
  });
  assert.deepEqual(getCategoryRoute(puzzleImages, 'easy', 'places'), {
    screen: 'Puzzle',
    params: { puzzleId: 'places-santorini' },
  });

  const duplicateTexture = {
    ...puzzleImages.find(({ imageId }) => imageId === 'places-santorini'),
    imageId: 'places-santorini-two',
    imageName: 'Santorini Two',
  };
  assert.deepEqual(getCategoryRoute([...puzzleImages, duplicateTexture], 'easy', 'places'), {
    screen: 'PuzzleSelection',
    params: { difficulty: 'easy', category: 'places' },
  });
});