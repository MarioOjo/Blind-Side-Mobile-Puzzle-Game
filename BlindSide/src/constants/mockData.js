// Sample data for the Home Dashboard and Profile screens until Firestore is wired up.
export const mockUser = {
  username: 'Alex Johnson',
  rank: 'Gold',
  wins: 12,
  losses: 5,
  bestTimeSeconds: 47,
};

export const mockChallenges = [
  { id: '1', opponent: 'Jordan', category: 'Places', status: 'pending', time: '--:--', timestamp: '5h ago' },
  { id: '2', opponent: 'Sam', category: 'Characters', status: 'won', time: '01:16', timestamp: '2h ago' },
  { id: '3', opponent: 'Riley', category: 'People', status: 'lost', time: '01:23', timestamp: '1d ago' },
];
