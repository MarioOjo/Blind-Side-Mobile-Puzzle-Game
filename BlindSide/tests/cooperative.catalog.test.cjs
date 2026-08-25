// Verifies fixed cooperative tiers, Hard-only categories, and context-preserving routing.
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
  const nodeRequire = createRequire(filename);
  const testRequire = (request) => {
    if (request === './puzzleCatalog') {
      return {
        CATEGORY_OPTIONS: [
          { key: 'characters', label: 'Characters', icon: 'rocket-outline' },
          { key: 'people', label: 'People', icon: 'people-outline' },
          { key: 'places', label: 'Places', icon: 'earth-outline' },
        ],
        normalizeCatalogValue: (value) => typeof value === 'string' ? value.trim().toLowerCase() : '',
      };
    }
    return nodeRequire(request);
  };
  const execute = new Function('require', 'module', 'exports', '__filename', '__dirname', code);
  execute(testRequire, loadedModule, loadedModule.exports, filename, path.dirname(filename));
  return loadedModule.exports;
}

const {
  COOPERATIVE_TIER_OPTIONS,
  createCooperativeContext,
  getCooperativeCategories,
  getCooperativeCategoryRoute,
  getCooperativePuzzles,
  isValidCooperativeContext,
} = loadAppModule('src/utils/cooperativeCatalog.js');

test('cooperative tiers and fixed Hard category counts are deterministic', () => {
  assert.deepEqual(COOPERATIVE_TIER_OPTIONS.map(({ key }) => key), [
    'acquaintance', 'friendship', 'lover',
  ]);
  assert.deepEqual(
    getCooperativeCategories(puzzleImages).map(({ key, count }) => ({ key, count })),
    [
      { key: 'characters', count: 0 },
      { key: 'people', count: 1 },
      { key: 'places', count: 1 },
    ],
  );
});

test('cooperative catalog includes only Hard puzzles in fixed real categories', () => {
  assert.deepEqual(getCooperativePuzzles(puzzleImages).map(({ imageId }) => imageId), [
    'places-marrakech-market',
    'people-colorful-portrait',
  ]);
  assert.deepEqual(getCooperativePuzzles([null, {}, ...puzzleImages], 'people')
    .map(({ imageId }) => imageId), ['people-colorful-portrait']);
  assert.deepEqual(getCooperativePuzzles(puzzleImages, 'textures'), []);
});

test('cooperative routing preserves context for empty, single, and multiple matches', () => {
  const context = createCooperativeContext({
    partnerId: 'bob-id', partnerName: 'Bob', tier: ' Friendship ',
  });
  assert.equal(isValidCooperativeContext(context), true);
  assert.equal(isValidCooperativeContext({ ...context, partnerId: '' }), false);
  assert.equal(isValidCooperativeContext({ ...context, tier: 'unknown' }), false);
  assert.deepEqual(getCooperativeCategoryRoute(puzzleImages, context, 'characters'), {
    screen: 'CooperativePuzzleSelection',
    params: { ...context, category: 'characters' },
  });
  assert.deepEqual(getCooperativeCategoryRoute(puzzleImages, context, 'people'), {
    screen: 'Puzzle',
    params: { ...context, category: 'people', puzzleId: 'people-colorful-portrait' },
  });

  const duplicate = {
    ...puzzleImages.find(({ imageId }) => imageId === 'people-colorful-portrait'),
    imageId: 'people-colorful-portrait-two',
    imageName: 'Portrait Two',
  };
  assert.deepEqual(getCooperativeCategoryRoute([...puzzleImages, duplicate], context, 'people'), {
    screen: 'CooperativePuzzleSelection',
    params: { ...context, category: 'people' },
  });
});