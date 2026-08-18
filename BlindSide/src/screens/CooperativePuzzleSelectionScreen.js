// Lists Hard cooperative puzzle matches or a coming-soon state for an empty category.
import { useCallback, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import PuzzleSelectionLayout from '../components/PuzzleSelectionLayout';
import PuzzleSelectionRow from '../components/PuzzleSelectionRow';
import { getPuzzleImages } from '../services/FirestoreService';
import {
  createCooperativeContext,
  getCooperativePuzzles,
  isValidCooperativeContext,
} from '../utils/cooperativeCatalog';
import { humanizeCatalogValue, normalizeCatalogValue } from '../utils/puzzleCatalog';

export default function CooperativePuzzleSelectionScreen({ navigation, route }) {
  const { width, height } = useWindowDimensions();
  const context = createCooperativeContext(route.params);
  const category = normalizeCatalogValue(route.params?.category);
  const contextIsValid = Boolean(isValidCooperativeContext(context) && category);
  const [puzzles, setPuzzles] = useState([]);
  const [isLoading, setIsLoading] = useState(contextIsValid);
  const [error, setError] = useState(
    contextIsValid ? '' : 'Choose a partner, tier, and category before selecting a puzzle.',
  );

  useFocusEffect(useCallback(() => {
    let isActive = true;
    if (!contextIsValid) return () => { isActive = false; };
    setIsLoading(true);
    setError('');

    getPuzzleImages()
      .then((catalog) => {
        if (isActive) setPuzzles(getCooperativePuzzles(catalog, category));
      })
      .catch(() => { if (isActive) setError('Unable to load cooperative puzzles.'); })
      .finally(() => { if (isActive) setIsLoading(false); });

    return () => { isActive = false; };
  }, [category, context.partnerId, context.tier, contextIsValid]));

  return (
    <PuzzleSelectionLayout
      title="Choose puzzle"
      subtitle={`${humanizeCatalogValue(context.tier)} · ${humanizeCatalogValue(category)} · Hard`}
      isLoading={isLoading}
      error={error}
      isEmpty={puzzles.length === 0}
      emptyMessage="More puzzles coming soon"
      isLandscape={width > height}
    >
      {puzzles.map((puzzle) => (
        <PuzzleSelectionRow
          key={puzzle.imageId}
          label={puzzle.imageName}
          supportingText="Hard"
          imageUrl={puzzle.imageURL}
          onPress={() => navigation.push('Puzzle', {
            ...context,
            category,
            puzzleId: puzzle.imageId,
          })}
        />
      ))}
    </PuzzleSelectionLayout>
  );
}