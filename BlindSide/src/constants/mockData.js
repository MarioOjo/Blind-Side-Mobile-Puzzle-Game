// Sample data for the Home Dashboard and Profile screens until real persistence is wired up.
export const mockUser = {
  // Mimics the current signed-in player for dashboard and profile placeholders.
  username: 'Alex Johnson',
  profileLabel: 'Puzzle Partner',
  puzzlesCompletedTogether: 12,
  partnersPlayedWith: 5,
  piecesPlacedTogether: 147,
};

// Session rows are intentionally small so the list layout is easy to scan on mobile.
export const mockPuzzleSessions = [
  { id: '1', partnerName: 'Jordan', category: 'Places', status: 'in-progress', piecesRemaining: 3, lastPlayed: '5h ago' },
  { id: '2', partnerName: 'Sam', category: 'Characters', status: 'completed', piecesRemaining: 0, lastPlayed: '2h ago' },
  { id: '3', partnerName: 'Riley', category: 'People', status: 'invited', piecesRemaining: 12, lastPlayed: '1d ago' },
];
