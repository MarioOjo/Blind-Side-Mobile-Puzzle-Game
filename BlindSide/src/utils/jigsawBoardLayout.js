// Calculates an orientation-independent full board rectangle and centered cover crop metadata.
export function getCoverImageLayout({ boardWidth, boardHeight, imageWidth, imageHeight }) {
  const scale = Math.max(boardWidth / imageWidth, boardHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    scale,
    width,
    height,
    offsetX: (width - boardWidth) / 2,
    offsetY: (height - boardHeight) / 2,
  };
}

export function getJigsawBoardLayout({
  workspaceWidth,
  workspaceHeight,
  trayWidth,
  workspaceGap,
  imageWidth,
  imageHeight,
}) {
  const boardWidth = Math.max(1, workspaceWidth - trayWidth - workspaceGap);
  const boardHeight = Math.max(1, workspaceHeight);

  return {
    boardX: 0,
    boardY: 0,
    boardWidth,
    boardHeight,
    cover: getCoverImageLayout({ boardWidth, boardHeight, imageWidth, imageHeight }),
  };
}