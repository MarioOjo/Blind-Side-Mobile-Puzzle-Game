// Verifies solo stopwatch formatting and strict prior-personal-best comparisons.
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

const { comparePersonalBest, formatElapsedTime, normalizeElapsedTime } = loadAppModule(
  'src/utils/soloRun.js',
);

test('elapsed time is normalized and formatted as minutes and seconds', () => {
  assert.equal(normalizeElapsedTime(-100), 0);
  assert.equal(normalizeElapsedTime(1499.6), 1500);
  assert.equal(formatElapsedTime(0), '0:00');
  assert.equal(formatElapsedTime(999), '0:00');
  assert.equal(formatElapsedTime(61000), '1:01');
  assert.equal(formatElapsedTime(3661000), '61:01');
});

test('personal best requires a first run or strictly faster completion', () => {
  assert.deepEqual(comparePersonalBest(42000, null), {
    isPersonalBest: true,
    priorBestTime: null,
    improvement: null,
  });
  assert.deepEqual(comparePersonalBest(41000, 42000), {
    isPersonalBest: true,
    priorBestTime: 42000,
    improvement: 1000,
  });
  assert.deepEqual(comparePersonalBest(42000, 42000), {
    isPersonalBest: false,
    priorBestTime: 42000,
    improvement: null,
  });
  assert.deepEqual(comparePersonalBest(43000, 42000), {
    isPersonalBest: false,
    priorBestTime: 42000,
    improvement: null,
  });
});