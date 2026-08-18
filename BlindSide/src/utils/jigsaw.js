// Generates deterministic interlocking geometry, tray order, and snap tolerances by difficulty.
const DIFFICULTY_LAYOUTS = {
  easy: { columns: 3, rows: 2, pieceCount: 6 },
  medium: { columns: 4, rows: 3, pieceCount: 12 },
  hard: { columns: 5, rows: 4, pieceCount: 20 },
};
const COOPERATIVE_DIFFICULTY_LAYOUTS = {
  hard: { columns: 8, rows: 6, pieceCount: 48 },
};

const TAB_DEPTH_RATIO = 0.2;
const BASE_EDGE_PROFILE = { center: 0.5, width: 0.36, curvature: 1.14 };
const DIFFICULTY_TUNING = {
  easy: {
    snapToleranceRatio: 0.36,
    profileVariance: { center: 0.12, width: 0.1, curvature: 0.2 },
  },
  medium: {
    snapToleranceRatio: 0.28,
    profileVariance: { center: 0.04, width: 0.04, curvature: 0.06 },
  },
  hard: {
    snapToleranceRatio: 0.2,
    profileVariance: { center: 0, width: 0, curvature: 0 },
  },
};

function normalizeDifficulty(difficulty) {
  const normalized = String(difficulty).toLowerCase();
  return normalized in DIFFICULTY_LAYOUTS ? normalized : 'medium';
}

export function getDifficultyLayout(difficulty) {
  return DIFFICULTY_LAYOUTS[normalizeDifficulty(difficulty)];
}

export function getCooperativeDifficultyLayout(difficulty) {
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  return COOPERATIVE_DIFFICULTY_LAYOUTS[normalizedDifficulty]
    ?? DIFFICULTY_LAYOUTS[normalizedDifficulty];
}

function boundaryDirection(primaryIndex, secondaryIndex) {
  return (primaryIndex + secondaryIndex) % 2 === 0 ? 1 : -1;
}

function pointOnEdge(start, end, progress, normalX = 0, normalY = 0, offset = 0) {
  return {
    x: start.x + ((end.x - start.x) * progress) + (normalX * offset),
    y: start.y + ((end.y - start.y) * progress) + (normalY * offset),
  };
}

function formatPoint(point) {
  return `${point.x.toFixed(3)} ${point.y.toFixed(3)}`;
}

function hashUnitInterval(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function varyProfileValue(base, variance, seamKey, dimension) {
  const signedUnit = (hashUnitInterval(`${seamKey}:${dimension}`) * 2) - 1;
  return Number((base + (signedUnit * variance)).toFixed(4));
}

function createSeamProfile(difficulty, seamKey) {
  const { profileVariance } = DIFFICULTY_TUNING[normalizeDifficulty(difficulty)];
  return {
    seamKey,
    center: varyProfileValue(BASE_EDGE_PROFILE.center, profileVariance.center, seamKey, 'center'),
    width: varyProfileValue(BASE_EDGE_PROFILE.width, profileVariance.width, seamKey, 'width'),
    curvature: varyProfileValue(
      BASE_EDGE_PROFILE.curvature,
      profileVariance.curvature,
      seamKey,
      'curvature',
    ),
  };
}

function createEdgePath(start, end, direction, normalX, normalY, depth, profile, reversed) {
  if (direction === 0) return `L ${formatPoint(end)}`;

  const center = reversed ? 1 - profile.center : profile.center;
  const outerHalfWidth = profile.width / 2;
  const innerHalfWidth = profile.width * 0.17;
  const transitionWidth = outerHalfWidth - innerHalfWidth;
  const offset = depth * direction;
  const lead = pointOnEdge(start, end, center - outerHalfWidth);
  const curve1Control1 = pointOnEdge(start, end, center - outerHalfWidth + (transitionWidth * 0.3));
  const curve1Control2 = pointOnEdge(
    start,
    end,
    center - innerHalfWidth - (transitionWidth * 0.3),
    normalX,
    normalY,
    offset,
  );
  const curve1End = pointOnEdge(
    start,
    end,
    center - innerHalfWidth,
    normalX,
    normalY,
    offset,
  );
  const curve2Control1 = pointOnEdge(
    start,
    end,
    center - (innerHalfWidth * 0.5),
    normalX,
    normalY,
    offset * profile.curvature,
  );
  const curve2Control2 = pointOnEdge(
    start,
    end,
    center + (innerHalfWidth * 0.5),
    normalX,
    normalY,
    offset * profile.curvature,
  );
  const curve2End = pointOnEdge(
    start,
    end,
    center + innerHalfWidth,
    normalX,
    normalY,
    offset,
  );
  const curve3Control1 = pointOnEdge(
    start,
    end,
    center + innerHalfWidth + (transitionWidth * 0.3),
    normalX,
    normalY,
    offset,
  );
  const curve3Control2 = pointOnEdge(
    start,
    end,
    center + outerHalfWidth - (transitionWidth * 0.3),
  );
  const curve3End = pointOnEdge(start, end, center + outerHalfWidth);

  return [
    `L ${formatPoint(lead)}`,
    `C ${formatPoint(curve1Control1)} ${formatPoint(curve1Control2)} ${formatPoint(curve1End)}`,
    `C ${formatPoint(curve2Control1)} ${formatPoint(curve2Control2)} ${formatPoint(curve2End)}`,
    `C ${formatPoint(curve3Control1)} ${formatPoint(curve3Control2)} ${formatPoint(curve3End)}`,
    `L ${formatPoint(end)}`,
  ].join(' ');
}

export function createPiecePath({ width, height, padding, edges, edgeProfiles = {} }) {
  const topLeft = { x: padding, y: padding };
  const topRight = { x: padding + width, y: padding };
  const bottomRight = { x: padding + width, y: padding + height };
  const bottomLeft = { x: padding, y: padding + height };
  const depth = Math.min(width, height) * TAB_DEPTH_RATIO;

  return [
    `M ${formatPoint(topLeft)}`,
    createEdgePath(
      topLeft, topRight, edges.top, 0, -1, depth, edgeProfiles.top ?? BASE_EDGE_PROFILE, false,
    ),
    createEdgePath(
      topRight, bottomRight, edges.right, 1, 0, depth,
      edgeProfiles.right ?? BASE_EDGE_PROFILE, false,
    ),
    createEdgePath(
      bottomRight, bottomLeft, edges.bottom, 0, 1, depth,
      edgeProfiles.bottom ?? BASE_EDGE_PROFILE, true,
    ),
    createEdgePath(
      bottomLeft, topLeft, edges.left, -1, 0, depth,
      edgeProfiles.left ?? BASE_EDGE_PROFILE, true,
    ),
    'Z',
  ].join(' ');
}

export function createJigsawPieces({ difficulty, boardWidth, boardHeight, layoutOverride = null }) {
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const layout = layoutOverride ?? getDifficultyLayout(normalizedDifficulty);
  const cellWidth = boardWidth / layout.columns;
  const cellHeight = boardHeight / layout.rows;
  const padding = Math.min(cellWidth, cellHeight) * (TAB_DEPTH_RATIO + 0.03);
  const pieces = [];

  for (let row = 0; row < layout.rows; row += 1) {
    for (let column = 0; column < layout.columns; column += 1) {
      const edges = {
        top: row === 0 ? 0 : -boundaryDirection(row - 1, column),
        right: column === layout.columns - 1 ? 0 : boundaryDirection(row, column),
        bottom: row === layout.rows - 1 ? 0 : boundaryDirection(row, column),
        left: column === 0 ? 0 : -boundaryDirection(row, column - 1),
      };
      const edgeProfiles = {
        top: edges.top === 0
          ? null
          : createSeamProfile(normalizedDifficulty, `horizontal:${row - 1}:${column}`),
        right: edges.right === 0
          ? null
          : createSeamProfile(normalizedDifficulty, `vertical:${row}:${column}`),
        bottom: edges.bottom === 0
          ? null
          : createSeamProfile(normalizedDifficulty, `horizontal:${row}:${column}`),
        left: edges.left === 0
          ? null
          : createSeamProfile(normalizedDifficulty, `vertical:${row}:${column - 1}`),
      };
      const targetX = column * cellWidth;
      const targetY = row * cellHeight;

      pieces.push({
        id: `piece-${row}-${column}`,
        index: (row * layout.columns) + column,
        row,
        column,
        edges,
        edgeProfiles,
        cellWidth,
        cellHeight,
        padding,
        renderWidth: cellWidth + (padding * 2),
        renderHeight: cellHeight + (padding * 2),
        targetX,
        targetY,
        path: createPiecePath({
          width: cellWidth,
          height: cellHeight,
          padding,
          edges,
          edgeProfiles,
        }),
      });
    }
  }

  return { ...layout, cellWidth, cellHeight, padding, pieces };
}

export function createTrayOrder(pieces) {
  return [...pieces].sort((first, second) => {
    const firstKey = ((first.index * 7) + 3) % pieces.length;
    const secondKey = ((second.index * 7) + 3) % pieces.length;
    return firstKey - secondKey;
  });
}

export function getTrayPageLayout({
  difficulty,
  pieceCount,
  availableHeight,
  pieceRenderHeight,
}) {
  const naturalCapacity = Math.max(1, Math.floor(availableHeight / pieceRenderHeight));
  const minimumCapacity = normalizeDifficulty(difficulty) === 'easy'
    ? Math.min(2, pieceCount)
    : 1;
  const pageCapacity = Math.max(naturalCapacity, minimumCapacity);

  return {
    pageCapacity,
    presentationScale: Math.min(1, availableHeight / (pieceRenderHeight * pageCapacity)),
    slotHeight: availableHeight / pageCapacity,
  };
}

export function getSnapTolerance(cellWidth, cellHeight, difficulty = 'medium') {
  const { snapToleranceRatio } = DIFFICULTY_TUNING[normalizeDifficulty(difficulty)];
  return Math.min(cellWidth, cellHeight) * snapToleranceRatio;
}

export function shouldSnapPiece({ x, y, targetX, targetY, tolerance }) {
  const boundaryEpsilon = Number.EPSILON * Math.max(1, tolerance) * 8;
  return Math.hypot(x - targetX, y - targetY) <= tolerance + boundaryEpsilon;
}