// Generates deterministic interlocking geometry, tray order, and snap tolerances by difficulty.
const DIFFICULTY_LAYOUTS = {
  easy: { columns: 3, rows: 2, pieceCount: 6 },
  medium: { columns: 4, rows: 3, pieceCount: 12 },
  hard: { columns: 5, rows: 4, pieceCount: 20 },
};

const TAB_DEPTH_RATIO = 0.2;
export const SNAP_TOLERANCE_RATIO = 0.28;

export function getDifficultyLayout(difficulty) {
  return DIFFICULTY_LAYOUTS[String(difficulty).toLowerCase()] ?? DIFFICULTY_LAYOUTS.medium;
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

function createEdgePath(start, end, direction, normalX, normalY, depth) {
  if (direction === 0) return `L ${formatPoint(end)}`;

  const offset = depth * direction;
  const lead = pointOnEdge(start, end, 0.32);
  const curve1Control1 = pointOnEdge(start, end, 0.37);
  const curve1Control2 = pointOnEdge(start, end, 0.36, normalX, normalY, offset);
  const curve1End = pointOnEdge(start, end, 0.44, normalX, normalY, offset);
  const curve2Control1 = pointOnEdge(start, end, 0.47, normalX, normalY, offset * 1.14);
  const curve2Control2 = pointOnEdge(start, end, 0.53, normalX, normalY, offset * 1.14);
  const curve2End = pointOnEdge(start, end, 0.56, normalX, normalY, offset);
  const curve3Control1 = pointOnEdge(start, end, 0.64, normalX, normalY, offset);
  const curve3Control2 = pointOnEdge(start, end, 0.63);
  const curve3End = pointOnEdge(start, end, 0.68);

  return [
    `L ${formatPoint(lead)}`,
    `C ${formatPoint(curve1Control1)} ${formatPoint(curve1Control2)} ${formatPoint(curve1End)}`,
    `C ${formatPoint(curve2Control1)} ${formatPoint(curve2Control2)} ${formatPoint(curve2End)}`,
    `C ${formatPoint(curve3Control1)} ${formatPoint(curve3Control2)} ${formatPoint(curve3End)}`,
    `L ${formatPoint(end)}`,
  ].join(' ');
}

export function createPiecePath({ width, height, padding, edges }) {
  const topLeft = { x: padding, y: padding };
  const topRight = { x: padding + width, y: padding };
  const bottomRight = { x: padding + width, y: padding + height };
  const bottomLeft = { x: padding, y: padding + height };
  const depth = Math.min(width, height) * TAB_DEPTH_RATIO;

  return [
    `M ${formatPoint(topLeft)}`,
    createEdgePath(topLeft, topRight, edges.top, 0, -1, depth),
    createEdgePath(topRight, bottomRight, edges.right, 1, 0, depth),
    createEdgePath(bottomRight, bottomLeft, edges.bottom, 0, 1, depth),
    createEdgePath(bottomLeft, topLeft, edges.left, -1, 0, depth),
    'Z',
  ].join(' ');
}

export function createJigsawPieces({ difficulty, boardWidth, boardHeight }) {
  const layout = getDifficultyLayout(difficulty);
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
      const targetX = column * cellWidth;
      const targetY = row * cellHeight;

      pieces.push({
        id: `piece-${row}-${column}`,
        index: (row * layout.columns) + column,
        row,
        column,
        edges,
        cellWidth,
        cellHeight,
        padding,
        renderWidth: cellWidth + (padding * 2),
        renderHeight: cellHeight + (padding * 2),
        targetX,
        targetY,
        path: createPiecePath({ width: cellWidth, height: cellHeight, padding, edges }),
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

export function getSnapTolerance(cellWidth, cellHeight) {
  return Math.min(cellWidth, cellHeight) * SNAP_TOLERANCE_RATIO;
}

export function shouldSnapPiece({ x, y, targetX, targetY, tolerance }) {
  const boundaryEpsilon = Number.EPSILON * Math.max(1, tolerance) * 8;
  return Math.hypot(x - targetX, y - targetY) <= tolerance + boundaryEpsilon;
}