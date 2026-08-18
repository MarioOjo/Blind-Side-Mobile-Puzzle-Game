// Formats solo elapsed time and compares a completed run against the prior personal best.
export function normalizeElapsedTime(elapsedTime) {
  return Math.max(0, Math.round(Number(elapsedTime) || 0));
}

export function formatElapsedTime(elapsedTime) {
  const totalSeconds = Math.floor(normalizeElapsedTime(elapsedTime) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function comparePersonalBest(completionTime, priorBestTime) {
  const current = normalizeElapsedTime(completionTime);
  const hasPriorBest = Number.isFinite(priorBestTime) && priorBestTime >= 0;
  const prior = hasPriorBest ? normalizeElapsedTime(priorBestTime) : null;

  return {
    isPersonalBest: prior === null || current < prior,
    priorBestTime: prior,
    improvement: prior !== null && current < prior ? prior - current : null,
  };
}