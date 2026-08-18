// Verifies unique solo completions, all-run totals, fastest times, and catalog hydration.
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
  const nodeRequire = createRequire(filename);
  const testRequire = (request) => {
    if (request === './puzzleCatalog') {
      return {
        humanizeCatalogValue: (value) => value
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
      };
    }
    return nodeRequire(request);
  };
  const execute = new Function('require', 'module', 'exports', '__filename', '__dirname', code);
  execute(testRequire, loadedModule, loadedModule.exports, filename, path.dirname(filename));
  return loadedModule.exports;
}

const { calculateSoloStats } = loadAppModule('src/utils/soloStats.js');

test('empty solo history returns zero summary values and no puzzle rows', () => {
  assert.deepEqual(calculateSoloStats([], []), {
    completedPuzzles: 0,
    totalPlayTime: 0,
    fastestCompletionTime: null,
    puzzleBests: [],
  });
});

test('replays count once as a puzzle but every run contributes to total time', () => {
  const sessions = [
    { mode: 'solo', status: 'completed', puzzleId: 'puzzle-a', completionTime: 45000, difficulty: 'easy', category: 'places' },
    { mode: 'solo', status: 'completed', puzzleId: 'puzzle-a', completionTime: 30000, difficulty: 'easy', category: 'places' },
    { mode: 'solo', status: 'completed', puzzleId: 'puzzle-b', completionTime: 60000, difficulty: 'hard', category: 'characters' },
  ];
  const result = calculateSoloStats(sessions, [
    { imageId: 'puzzle-a', imageName: 'Alpha', difficultyRecommended: 'medium', category: 'people' },
    { imageId: 'puzzle-b', imageName: 'Beta', difficultyRecommended: 'medium', category: 'people' },
  ]);

  assert.equal(result.completedPuzzles, 2);
  assert.equal(result.totalPlayTime, 135000);
  assert.equal(result.fastestCompletionTime, 30000);
  assert.deepEqual(result.puzzleBests, [
    { puzzleId: 'puzzle-a', puzzleName: 'Alpha', difficulty: 'easy', category: 'places', completionTime: 30000 },
    { puzzleId: 'puzzle-b', puzzleName: 'Beta', difficulty: 'hard', category: 'characters', completionTime: 60000 },
  ]);
});

test('invalid runs are ignored and missing puzzle content uses stable fallbacks', () => {
  const valid = {
    mode: 'solo', status: 'completed', puzzleId: 'lost-puzzle', completionTime: 50000,
  };
  const result = calculateSoloStats([
    valid,
    { ...valid, mode: 'cooperative' },
    { ...valid, status: 'abandoned' },
    { ...valid, completionTime: -1 },
    { ...valid, completionTime: Number.NaN },
    { ...valid, puzzleId: '' },
  ]);

  assert.equal(result.completedPuzzles, 1);
  assert.deepEqual(result.puzzleBests, [{
    puzzleId: 'lost-puzzle',
    puzzleName: 'Lost Puzzle',
    difficulty: '',
    category: '',
    completionTime: 50000,
  }]);
});

test('equal best times produce one deterministic row and catalog fallback metadata', () => {
  const sessions = [
    { mode: 'solo', status: 'completed', puzzleId: 'zeta', completionTime: 25000 },
    { mode: 'solo', status: 'completed', puzzleId: 'zeta', completionTime: 25000 },
    { mode: 'solo', status: 'completed', puzzleId: 'alpha', completionTime: 40000 },
  ];
  const result = calculateSoloStats(sessions, [
    { imageId: 'zeta', imageName: 'Zeta', difficultyRecommended: 'medium', category: 'places' },
    { imageId: 'alpha', imageName: 'Alpha', difficultyRecommended: 'easy', category: 'people' },
  ]);

  assert.deepEqual(result.puzzleBests.map(({ puzzleId }) => puzzleId), ['alpha', 'zeta']);
  assert.equal(result.puzzleBests[1].difficulty, 'medium');
  assert.equal(result.puzzleBests[1].category, 'places');
});