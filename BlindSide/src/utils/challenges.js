// Computes achievement unlock state live from session history — no separate persisted record.
import { humanizeCatalogValue } from './puzzleCatalog';
import { getSessionPartnerId } from './cooperativeSessions';

// ─── milestone definitions ───────────────────────────────────────────────────

// Each milestone: { id, label, description, icon, check(soloSessions, coopSessions, uid) → bool }
const SOLO_MILESTONES = [
  {
    id: 'solo_first',
    label: 'First Piece',
    description: 'Complete your first solo puzzle.',
    icon: 'checkmark-circle-outline',
    check: (solo) => solo.length >= 1,
  },
  {
    id: 'solo_5',
    label: 'Puzzle Enthusiast',
    description: 'Complete 5 solo puzzles.',
    icon: 'layers-outline',
    check: (solo) => solo.length >= 5,
  },
  {
    id: 'solo_10',
    label: 'Puzzle Veteran',
    description: 'Complete 10 solo puzzles.',
    icon: 'ribbon-outline',
    check: (solo) => solo.length >= 10,
  },
  {
    id: 'solo_25',
    label: 'Puzzle Master',
    description: 'Complete 25 solo puzzles.',
    icon: 'trophy-outline',
    check: (solo) => solo.length >= 25,
  },
  {
    id: 'solo_pb',
    label: 'Personal Best',
    description: 'Beat your own record on any puzzle.',
    icon: 'speedometer-outline',
    check: (solo) => {
      const countByPuzzle = new Map();
      for (const session of solo) {
        countByPuzzle.set(session.puzzleId, (countByPuzzle.get(session.puzzleId) ?? 0) + 1);
      }
      return [...countByPuzzle.values()].some((count) => count >= 2);
    },
  },
  {
    id: 'solo_hard',
    label: 'Hard Mode',
    description: 'Complete a Hard difficulty puzzle.',
    icon: 'flame-outline',
    check: (solo) => solo.some((s) => String(s.difficulty).toLowerCase() === 'hard'),
  },
  {
    id: 'solo_all_tiers',
    label: 'Full Spectrum',
    description: 'Complete at least one Easy, Medium, and Hard puzzle.',
    icon: 'grid-outline',
    check: (solo) => {
      const difficulties = new Set(solo.map((s) => String(s.difficulty).toLowerCase()));
      return difficulties.has('easy') && difficulties.has('medium') && difficulties.has('hard');
    },
  },
];

const COOP_MILESTONES = [
  {
    id: 'coop_first',
    label: 'Better Together',
    description: 'Complete your first cooperative puzzle.',
    icon: 'people-circle-outline',
    check: (_solo, coop) => coop.length >= 1,
  },
  {
    id: 'coop_partners',
    label: 'Social Puzzler',
    description: 'Play with 3 different partners.',
    icon: 'person-add-outline',
    check: (_solo, coop, uid) => {
      const partners = new Set(
        coop.map((s) => getSessionPartnerId(s, uid)).filter(Boolean),
      );
      return partners.size >= 3;
    },
  },
  {
    id: 'coop_questions',
    label: 'Deep Conversations',
    description: 'Answer 20 questions together across all sessions.',
    icon: 'chatbubble-ellipses-outline',
    check: (_solo, coop) => {
      const total = coop.reduce((sum, s) => sum + (s.questionsAnswered ?? 0), 0);
      return total >= 20;
    },
  },
  {
    id: 'coop_48',
    label: 'The Full Picture',
    description: 'Complete a full 48-piece cooperative puzzle.',
    icon: 'extension-puzzle-outline',
    check: (_solo, coop) => coop.some((s) => (s.piecesPlacedTogether ?? 0) >= 48),
  },
];

export const MILESTONE_GROUPS = [
  { key: 'solo', label: 'Solo', milestones: SOLO_MILESTONES },
  { key: 'coop', label: 'Cooperative', milestones: COOP_MILESTONES },
];

// ─── compute ─────────────────────────────────────────────────────────────────

export function computeChallenges(soloSessions, coopSessions, uid) {
  const completedSolo = (soloSessions ?? []).filter((s) => s.status === 'completed');
  const completedCoop = (coopSessions ?? []).filter((s) => s.status === 'completed');

  return MILESTONE_GROUPS.map(({ key, label, milestones }) => ({
    key,
    label,
    milestones: milestones.map((milestone) => ({
      ...milestone,
      unlocked: milestone.check(completedSolo, completedCoop, uid),
    })),
  }));
}

// ─── result row helpers ───────────────────────────────────────────────────────

export function presentSoloResult(session, puzzleCatalog = []) {
  const puzzle = puzzleCatalog.find((p) => p.imageId === session.puzzleId);
  return {
    id: session.id,
    puzzleName: puzzle?.imageName ?? humanizeCatalogValue(session.puzzleId),
    difficulty: humanizeCatalogValue(session.difficulty ?? puzzle?.difficultyRecommended ?? ''),
    category: humanizeCatalogValue(session.category ?? puzzle?.category ?? ''),
    completionTime: session.completionTime ?? 0,
    completedAt: session.completedAt ?? session.createdAt ?? null,
  };
}

export function presentCoopResult(session, uid, profilesByUid, puzzleCatalog = []) {
  const puzzle = puzzleCatalog.find((p) => p.imageId === session.puzzleId);
  const partnerId = getSessionPartnerId(session, uid);
  return {
    id: session.id,
    puzzleName: puzzle?.imageName ?? humanizeCatalogValue(session.puzzleId),
    partnerName: profilesByUid[partnerId]?.username ?? 'Puzzle Partner',
    tier: humanizeCatalogValue(session.tier ?? ''),
    turnCount: session.turnCount ?? 0,
    questionsAnswered: session.questionsAnswered ?? 0,
    questionsSkipped: session.questionsSkipped ?? 0,
    completionTime: session.completionTime ?? 0,
    completedAt: session.completedAt ?? session.createdAt ?? null,
  };
}
