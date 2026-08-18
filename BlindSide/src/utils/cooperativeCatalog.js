// Derives fixed cooperative tiers and Hard-only category/puzzle choices with route context.
import { CATEGORY_OPTIONS, normalizeCatalogValue } from './puzzleCatalog';

export const COOPERATIVE_DIFFICULTY = 'hard';
export const COOPERATIVE_TIER_OPTIONS = [
  { key: 'acquaintance', label: 'Acquaintance', icon: 'person-outline' },
  { key: 'friendship', label: 'Friendship', icon: 'people-outline' },
  { key: 'lover', label: 'Lover', icon: 'heart-outline' },
];

const FIXED_CATEGORIES = new Set(CATEGORY_OPTIONS.map(({ key }) => key));

export function getCooperativePuzzles(puzzles, category) {
  const normalizedCategory = normalizeCatalogValue(category);
  return (Array.isArray(puzzles) ? puzzles : [])
    .filter((puzzle) => puzzle?.imageId && puzzle?.imageName)
    .filter((puzzle) => (
      normalizeCatalogValue(puzzle.difficultyRecommended) === COOPERATIVE_DIFFICULTY
      && FIXED_CATEGORIES.has(normalizeCatalogValue(puzzle.category))
    ))
    .filter((puzzle) => (
      !normalizedCategory || normalizeCatalogValue(puzzle.category) === normalizedCategory
    ))
    .sort((first, second) => (
      first.imageName.localeCompare(second.imageName) || first.imageId.localeCompare(second.imageId)
    ));
}

export function getCooperativeCategories(puzzles) {
  return CATEGORY_OPTIONS.map((option) => ({
    ...option,
    count: getCooperativePuzzles(puzzles, option.key).length,
  }));
}

export function createCooperativeContext({ partnerId, partnerName, tier } = {}) {
  return {
    mode: 'cooperative',
    partnerId,
    partnerName,
    tier: normalizeCatalogValue(tier),
  };
}

export function isValidCooperativeContext(context) {
  return context?.mode === 'cooperative'
    && typeof context.partnerId === 'string'
    && context.partnerId.length > 0
    && COOPERATIVE_TIER_OPTIONS.some(({ key }) => key === normalizeCatalogValue(context.tier));
}

export function getCooperativeCategoryRoute(puzzles, context, category) {
  const matches = getCooperativePuzzles(puzzles, category);
  const routeContext = {
    ...createCooperativeContext(context),
    category: normalizeCatalogValue(category),
  };

  if (matches.length === 1) {
    return {
      screen: 'Puzzle',
      params: { ...routeContext, puzzleId: matches[0].imageId },
    };
  }
  return { screen: 'CooperativePuzzleSelection', params: routeContext };
}