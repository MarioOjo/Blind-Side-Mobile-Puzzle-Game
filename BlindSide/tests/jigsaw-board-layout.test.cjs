// Verifies full board-area sizing and centered cover crops for every source orientation.
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

const { getCoverImageLayout, getJigsawBoardLayout } = loadAppModule(
  'src/utils/jigsawBoardLayout.js',
);

test('board always fills the complete area beside the tray', () => {
  for (const imageSize of [
    { imageWidth: 800, imageHeight: 1200 },
    { imageWidth: 1000, imageHeight: 1000 },
    { imageWidth: 1600, imageHeight: 900 },
  ]) {
    const layout = getJigsawBoardLayout({
      workspaceWidth: 900,
      workspaceHeight: 400,
      trayWidth: 200,
      workspaceGap: 16,
      ...imageSize,
    });
    assert.equal(layout.boardX, 0);
    assert.equal(layout.boardY, 0);
    assert.equal(layout.boardWidth, 684);
    assert.equal(layout.boardHeight, 400);
    assert.ok(layout.cover.width >= layout.boardWidth);
    assert.ok(layout.cover.height >= layout.boardHeight);
  }
});

test('cover crop preserves aspect ratio and centers overflow', () => {
  const portrait = getCoverImageLayout({
    boardWidth: 684,
    boardHeight: 400,
    imageWidth: 800,
    imageHeight: 1200,
  });
  assert.ok(Math.abs((portrait.width / portrait.height) - (800 / 1200)) < Number.EPSILON);
  assert.equal(portrait.width, 684);
  assert.equal(portrait.offsetX, 0);
  assert.ok(portrait.offsetY > 0);

  const landscape = getCoverImageLayout({
    boardWidth: 684,
    boardHeight: 400,
    imageWidth: 1600,
    imageHeight: 900,
  });
  assert.ok(Math.abs((landscape.width / landscape.height) - (1600 / 900)) < Number.EPSILON);
  assert.equal(landscape.height, 400);
  assert.equal(landscape.offsetY, 0);
  assert.ok(landscape.offsetX > 0);
});

test('board and cover geometry remain finite for constrained workspaces', () => {
  const layout = getJigsawBoardLayout({
    workspaceWidth: 160,
    workspaceHeight: 1,
    trayWidth: 150,
    workspaceGap: 16,
    imageWidth: 900,
    imageHeight: 1200,
  });
  Object.values(layout).forEach((value) => {
    if (typeof value === 'number') assert.equal(Number.isFinite(value), true);
  });
  Object.values(layout.cover).forEach((value) => assert.equal(Number.isFinite(value), true));
  assert.equal(layout.boardWidth, 1);
  assert.equal(layout.boardHeight, 1);
});

test('guide and SVG pieces use the same centered cover policy', () => {
  const boardSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'JigsawBoard.js'),
    'utf8',
  );
  const pieceSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'JigsawPiece.js'),
    'utf8',
  );

  assert.match(boardSource, /resizeMode="cover"/);
  assert.equal((boardSource.match(/preserveAspectRatio="xMidYMid slice"/g) ?? []).length, 1);
  assert.equal((pieceSource.match(/preserveAspectRatio="xMidYMid slice"/g) ?? []).length, 1);
  assert.doesNotMatch(boardSource, /resizeMode="stretch"/);
  assert.doesNotMatch(pieceSource, /preserveAspectRatio="none"/);
});