// Converts solo session records into display-ready summaries for Recent Activity.
import { formatRelativeTime } from './cooperativeSessions';

const STATUS_LABELS = {
  inProgress: 'In progress',
  completed: 'Completed',
  abandoned: 'Puzzle ended',
};

export function presentSoloSession(session, now = Date.now()) {
  const placedCount = Array.isArray(session.placedPieceIds) ? session.placedPieceIds.length : 0;

  return {
    id: session.id,
    mode: 'solo',
    puzzleId: session.puzzleId,
    // No partner for a solo row — reuses PuzzleSessionListItem's name slot
    // so the same component can render both without a second component.
    partnerName: 'Solo',
    status: session.status,
    statusLabel: STATUS_LABELS[session.status] ?? STATUS_LABELS.inProgress,
    progressLabel: session.status === 'completed'
      ? 'Complete'
      : `${placedCount} ${placedCount === 1 ? 'piece' : 'pieces'} placed`,
    lastPlayed: formatRelativeTime(session.createdAt, now),
  };
}
