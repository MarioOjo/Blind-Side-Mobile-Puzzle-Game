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
  shouldSnapPiece,
} = loadAppModule('src/utils/jigsaw.js');

test('difficulty maps to fixed Stage B piece counts', () => {
  assert.deepEqual(getDifficultyLayout('easy'), { columns: 3, rows: 2, pieceCount: 6 });
  assert.deepEqual(getDifficultyLayout('MEDIUM'), { columns: 4, rows: 3, pieceCount: 12 });
  assert.deepEqual(getDifficultyLayout('hard'), { columns: 5, rows: 4, pieceCount: 20 });
  assert.deepEqual(getDifficultyLayout('unexpected'), { columns: 4, rows: 3, pieceCount: 12 });
});

test('jigsaw generation is deterministic with complementary curved edges', () => {
  const first = createJigsawPieces({ difficulty: 'hard', boardWidth: 500, boardHeight: 320 });
  const second = createJigsawPieces({ difficulty: 'hard', boardWidth: 500, boardHeight: 320 });
  assert.deepEqual(first, second);
  assert.equal(first.pieces.length, 20);
  assert.equal(new Set(first.pieces.map(({ id }) => id)).size, 20);

  first.pieces.forEach((piece) => {
    assert.match(piece.path, / C /);
    assert.ok(Object.values(piece).filter((value) => typeof value === 'number').every(Number.isFinite));
    if (piece.row === 0) assert.equal(piece.edges.top, 0);
    if (piece.column === 0) assert.equal(piece.edges.left, 0);
    if (piece.row === first.rows - 1) assert.equal(piece.edges.bottom, 0);
    if (piece.column === first.columns - 1) assert.equal(piece.edges.right, 0);

    if (piece.column < first.columns - 1) {
      const rightNeighbor = first.pieces[piece.index + 1];
      assert.equal(piece.edges.right, -rightNeighbor.edges.left);
    }
    if (piece.row < first.rows - 1) {
      const bottomNeighbor = first.pieces[piece.index + first.columns];
      assert.equal(piece.edges.bottom, -bottomNeighbor.edges.top);
    }
  });
});

test('tray order is deterministic, complete, and not solved order', () => {
  const { pieces } = createJigsawPieces({ difficulty: 'medium', boardWidth: 400, boardHeight: 300 });
  const ordered = createTrayOrder(pieces);
  assert.deepEqual(createTrayOrder(pieces), ordered);
  assert.deepEqual(new Set(ordered.map(({ id }) => id)), new Set(pieces.map(({ id }) => id)));
  assert.notDeepEqual(ordered.map(({ id }) => id), pieces.map(({ id }) => id));
});

test('snap detection includes the tolerance boundary and rejects misses', () => {
  const tolerance = getSnapTolerance(100, 80);
  assert.equal(tolerance, 22.400000000000002);
  assert.equal(shouldSnapPiece({ x: 10, y: 10, targetX: 10, targetY: 10, tolerance }), true);
  assert.equal(shouldSnapPiece({ x: 10 + tolerance, y: 10, targetX: 10, targetY: 10, tolerance }), true);
  assert.equal(shouldSnapPiece({ x: 10 + tolerance + 0.001, y: 10, targetX: 10, targetY: 10, tolerance }), false);
});