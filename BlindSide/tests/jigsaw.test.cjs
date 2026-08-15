// Verifies deterministic jigsaw layouts, complementary edges, tray order, and snap boundaries.
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
  createJigsawPieces,
  createTrayOrder,
  getDifficultyLayout,
  getSnapTolerance,
  getTrayPageLayout,
  shouldSnapPiece,
} = loadAppModule('src/utils/jigsaw.js');

test('difficulty maps to fixed Stage B piece counts', () => {
  assert.deepEqual(getDifficultyLayout('easy'), { columns: 3, rows: 2, pieceCount: 6 });
  assert.deepEqual(getDifficultyLayout('MEDIUM'), { columns: 4, rows: 3, pieceCount: 12 });
  assert.deepEqual(getDifficultyLayout('hard'), { columns: 5, rows: 4, pieceCount: 20 });
  assert.deepEqual(getDifficultyLayout('unexpected'), { columns: 4, rows: 3, pieceCount: 12 });
});

test('jigsaw generation is deterministic with complementary curved edges', () => {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const first = createJigsawPieces({ difficulty, boardWidth: 500, boardHeight: 320 });
    const second = createJigsawPieces({ difficulty, boardWidth: 500, boardHeight: 320 });
    assert.deepEqual(first, second);
    assert.equal(new Set(first.pieces.map(({ id }) => id)).size, first.pieceCount);

    first.pieces.forEach((piece) => {
      assert.match(piece.path, / C /);
      assert.ok(Object.values(piece).filter((value) => typeof value === 'number').every(Number.isFinite));
      if (piece.row === 0) {
        assert.equal(piece.edges.top, 0);
        assert.equal(piece.edgeProfiles.top, null);
      }
      if (piece.column === 0) {
        assert.equal(piece.edges.left, 0);
        assert.equal(piece.edgeProfiles.left, null);
      }
      if (piece.row === first.rows - 1) {
        assert.equal(piece.edges.bottom, 0);
        assert.equal(piece.edgeProfiles.bottom, null);
      }
      if (piece.column === first.columns - 1) {
        assert.equal(piece.edges.right, 0);
        assert.equal(piece.edgeProfiles.right, null);
      }

      if (piece.column < first.columns - 1) {
        const rightNeighbor = first.pieces[piece.index + 1];
        assert.equal(piece.edges.right, -rightNeighbor.edges.left);
        assert.deepEqual(piece.edgeProfiles.right, rightNeighbor.edgeProfiles.left);
      }
      if (piece.row < first.rows - 1) {
        const bottomNeighbor = first.pieces[piece.index + first.columns];
        assert.equal(piece.edges.bottom, -bottomNeighbor.edges.top);
        assert.deepEqual(piece.edgeProfiles.bottom, bottomNeighbor.edgeProfiles.top);
      }
    });
  }
});

function uniqueSeamProfiles(geometry) {
  const profiles = new Map();
  geometry.pieces.forEach(({ edgeProfiles }) => {
    Object.values(edgeProfiles).filter(Boolean).forEach((profile) => {
      profiles.set(profile.seamKey, profile);
    });
  });
  return [...profiles.values()];
}

function profileRange(profiles, field) {
  const values = profiles.map((profile) => profile[field]);
  return Math.max(...values) - Math.min(...values);
}

test('Bezier profile variance decreases from Easy to Hard', () => {
  const geometries = Object.fromEntries(['easy', 'medium', 'hard'].map((difficulty) => [
    difficulty,
    createJigsawPieces({ difficulty, boardWidth: 600, boardHeight: 400 }),
  ]));
  const profiles = Object.fromEntries(Object.entries(geometries).map(([difficulty, geometry]) => [
    difficulty,
    uniqueSeamProfiles(geometry),
  ]));

  for (const field of ['center', 'width', 'curvature']) {
    assert.ok(profileRange(profiles.easy, field) > profileRange(profiles.medium, field));
    assert.ok(profileRange(profiles.medium, field) > profileRange(profiles.hard, field));
    assert.equal(profileRange(profiles.hard, field), 0);
  }
  assert.ok(new Set(profiles.easy.map(({ center, width, curvature }) => (
    `${center}:${width}:${curvature}`
  ))).size > 1);
});

test('tray order is deterministic, complete, and not solved order', () => {
  const { pieces } = createJigsawPieces({ difficulty: 'medium', boardWidth: 400, boardHeight: 300 });
  const ordered = createTrayOrder(pieces);
  assert.deepEqual(createTrayOrder(pieces), ordered);
  assert.deepEqual(new Set(ordered.map(({ id }) => id)), new Set(pieces.map(({ id }) => id)));
  assert.notDeepEqual(ordered.map(({ id }) => id), pieces.map(({ id }) => id));
});

test('snap tolerance scales by difficulty and preserves exact boundary behavior', () => {
  const expectedRatios = { easy: 0.36, medium: 0.28, hard: 0.2 };

  Object.entries(expectedRatios).forEach(([difficulty, expectedRatio]) => {
    const tolerance = getSnapTolerance(100, 80, difficulty);
    assert.ok(Math.abs((tolerance / 80) - expectedRatio) < Number.EPSILON);
    assert.equal(shouldSnapPiece({ x: 10, y: 10, targetX: 10, targetY: 10, tolerance }), true);
    assert.equal(
      shouldSnapPiece({ x: 10 + tolerance, y: 10, targetX: 10, targetY: 10, tolerance }),
      true,
    );
    assert.equal(
      shouldSnapPiece({
        x: 10 + tolerance + 0.001,
        y: 10,
        targetX: 10,
        targetY: 10,
        tolerance,
      }),
      false,
    );
  });
  assert.equal(getSnapTolerance(100, 80, 'unexpected'), getSnapTolerance(100, 80, 'medium'));
});

test('Easy tray scales presentation to keep at least two pieces per page', () => {
  const easyLayout = getTrayPageLayout({
    difficulty: 'easy',
    pieceCount: 6,
    availableHeight: 302,
    pieceRenderHeight: 260,
  });
  assert.equal(easyLayout.pageCapacity, 2);
  assert.ok(easyLayout.presentationScale < 1);
  assert.equal(easyLayout.slotHeight, 151);
  assert.ok((260 * easyLayout.presentationScale) <= easyLayout.slotHeight);

  const mediumLayout = getTrayPageLayout({
    difficulty: 'medium',
    pieceCount: 12,
    availableHeight: 302,
    pieceRenderHeight: 260,
  });
  assert.deepEqual(mediumLayout, {
    pageCapacity: 1,
    presentationScale: 1,
    slotHeight: 302,
  });
});