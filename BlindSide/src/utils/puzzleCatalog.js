// Derives deterministic difficulty, category, and puzzle choices from the Firestore catalog.
export const DIFFICULTY_OPTIONS = [
  { key: 'easy', label: 'Easy', icon: 'sparkles-outline' },
  { key: 'medium', label: 'Medium', icon: 'shapes-outline' },
  { key: 'hard', label: 'Hard', icon: 'flame-outline' },
];

export const CATEGORY_OPTIONS = [
  { key: 'characters', label: 'Characters', icon: 'rocket-outline' },
  { key: 'people', label: 'People', icon: 'people-outline' },
  { key: 'places', label: 'Places', icon: 'earth-outline' },
];

export function normalizeCatalogValue(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function humanizeCatalogValue(value) {
  return normalizeCatalogValue(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getPuzzlesForSelection(puzzles, { difficulty, category } = {}) {
  const normalizedDifficulty = normalizeCatalogValue(difficulty);
  const normalizedCategory = normalizeCatalogValue(category);

  return (Array.isArray(puzzles) ? puzzles : [])
    .filter((puzzle) => puzzle?.imageId && puzzle?.imageName)
    .filter((puzzle) => (
      !normalizedDifficulty
      || normalizeCatalogValue(puzzle.difficultyRecommended) === normalizedDifficulty
    ))
    .filter((puzzle) => (
      !normalizedCategory || normalizeCatalogValue(puzzle.category) === normalizedCategory
    ))
    .sort((first, second) => (
      first.imageName.localeCompare(second.imageName) || first.imageId.localeCompare(second.imageId)
    ));
}

export function getAvailableDifficulties(puzzles) {
  return DIFFICULTY_OPTIONS.map((option) => ({
    ...option,
    count: getPuzzlesForSelection(puzzles, { difficulty: option.key }).length,
  }));
}

export function getAvailableCategories(puzzles, difficulty) {
  return CATEGORY_OPTIONS.map((option) => ({
    ...option,
    count: getPuzzlesForSelection(puzzles, {
      difficulty,
      category: option.key,
    }).length,
  }));
}

export function getCategoryRoute(puzzles, difficulty, category) {
  const matches = getPuzzlesForSelection(puzzles, { difficulty, category });
  if (matches.length === 1) return { screen: 'Puzzle', params: { puzzleId: matches[0].imageId } };
  return { screen: 'PuzzleSelection', params: { difficulty, category } };
}