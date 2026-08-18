// Converts cooperative session records into display-ready summaries and aggregate statistics.
export function getSessionPartnerId(session, currentUid) {
  return session.partnerIds?.find((uid) => uid !== currentUid) ?? null;
}

export function indexProfilesByUid(profiles) {
  return Object.fromEntries(profiles.map((profile) => [profile.uid, profile]));
}

export function formatRelativeTime(timestamp, now = Date.now()) {
  const date = timestamp?.toDate?.() ?? timestamp;
  const milliseconds = date instanceof Date ? date.getTime() : Number.NaN;
  if (!Number.isFinite(milliseconds)) return 'Recently';

  const elapsedMinutes = Math.max(0, Math.floor((now - milliseconds) / 60000));
  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}

export function presentCooperativeSession(session, currentUid, profilesByUid, now = Date.now()) {
  const partnerId = getSessionPartnerId(session, currentUid);
  const piecesPlaced = session.piecesPlacedTogether ?? 0;

  return {
    id: session.id,
    partnerName: profilesByUid[partnerId]?.username ?? 'Puzzle Partner',
    status: session.status,
    progressLabel: session.status === 'completed'
      ? 'Complete'
      : `${piecesPlaced} ${piecesPlaced === 1 ? 'piece' : 'pieces'} placed`,
    lastPlayed: formatRelativeTime(session.createdAt, now),
  };
}

export function calculateCooperativeStats(sessions, currentUid) {
  const partnerIds = sessions.map((session) => getSessionPartnerId(session, currentUid)).filter(Boolean);
  const completed = sessions.filter((session) => session.status === 'completed');

  return {
    completedSessions: completed.length,
    partnersPlayedWith: new Set(partnerIds).size,
    piecesPlacedTogether: sessions.reduce(
      (total, session) => total + (session.piecesPlacedTogether ?? 0),
      0,
    ),
    questionsAnswered: completed.reduce(
      (total, session) => total + (session.questionsAnswered ?? 0),
      0,
    ),
    questionsSkipped: completed.reduce(
      (total, session) => total + (session.questionsSkipped ?? 0),
      0,
    ),
  };
}