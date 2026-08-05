// Sample data for the Home Dashboard and Profile screens until real persistence is wired up.
export const mockUser = {
  // Mimics the current signed-in player for dashboard and profile placeholders.
  username: 'Alex Johnson',
  rank: 'Gold',
  wins: 12,
  losses: 5,
  bestTimeSeconds: 47,
};

// Challenge rows are intentionally small so the list layout is easy to scan on mobile.
export const mockChallenges = [
  { id: '1', opponent: 'Jordan', category: 'Places', status: 'pending', time: '--:--', timestamp: '5h ago' },
  { id: '2', opponent: 'Sam', category: 'Characters', status: 'won', time: '01:16', timestamp: '2h ago' },
  { id: '3', opponent: 'Riley', category: 'People', status: 'lost', time: '01:23', timestamp: '1d ago' },
];
