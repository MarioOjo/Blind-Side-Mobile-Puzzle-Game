// Aggregates completed solo history into Profile summary metrics and per-puzzle bests.
import { humanizeCatalogValue } from './puzzleCatalog';

function isCompletedSoloSession(session) {
  return session?.mode === 'solo'
    && session.status === 'completed'
    && typeof session.puzzleId === 'string'
    && session.puzzleId.trim().length > 0
    && Number.isFinite(session.completionTime)
    && session.completionTime >= 0;
}

export function calculateSoloStats(sessions, puzzleCatalog = []) {
  const completedRuns = (Array.isArray(sessions) ? sessions : []).filter(isCompletedSoloSession);
  const catalogById = new Map((Array.isArray(puzzleCatalog) ? puzzleCatalog : [])
    .filter((puzzle) => puzzle?.imageId)
    .map((puzzle) => [puzzle.imageId, puzzle]));
  const bestByPuzzle = new Map();

  completedRuns.forEach((session) => {
    const currentBest = bestByPuzzle.get(session.puzzleId);
    if (!currentBest || session.completionTime < currentBest.completionTime) {
      bestByPuzzle.set(session.puzzleId, session);
    }
  });

  const puzzleBests = [...bestByPuzzle.entries()].map(([puzzleId, session]) => {
    const puzzle = catalogById.get(puzzleId);
    return {
      puzzleId,
      puzzleName: puzzle?.imageName ?? humanizeCatalogValue(puzzleId),
      difficulty: session.difficulty ?? puzzle?.difficultyRecommended ?? '',
      category: session.category ?? puzzle?.category ?? '',
      completionTime: session.completionTime,
    };
  }).sort((first, second) => (
    first.puzzleName.localeCompare(second.puzzleName)
    || first.puzzleId.localeCompare(second.puzzleId)
  ));

  return {
    completedPuzzles: puzzleBests.length,
    totalPlayTime: completedRuns.reduce((total, session) => total + session.completionTime, 0),
    fastestCompletionTime: completedRuns.length > 0
      ? Math.min(...completedRuns.map(({ completionTime }) => completionTime))
      : null,
    puzzleBests,
  };
}