// Lists all puzzles when a selected difficulty and category contain multiple matches.
import { useCallback, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import PuzzleSelectionLayout from '../components/PuzzleSelectionLayout';
import PuzzleSelectionRow from '../components/PuzzleSelectionRow';
import { getPuzzleImages } from '../services/FirestoreService';
import {
  getPuzzlesForSelection,
  humanizeCatalogValue,
  normalizeCatalogValue,
} from '../utils/puzzleCatalog';

export default function PuzzleSelectionScreen({ navigation, route }) {
  const { width, height } = useWindowDimensions();
  const difficulty = normalizeCatalogValue(route.params?.difficulty);
  const category = normalizeCatalogValue(route.params?.category);
  const [puzzles, setPuzzles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    let isActive = true;
    setIsLoading(true);
    setError('');

    if (!difficulty || !category) {
      setError('Choose a difficulty and category before selecting a puzzle.');
      setIsLoading(false);
      return () => { isActive = false; };
    }

    getPuzzleImages()
      .then((catalog) => {
        if (isActive) setPuzzles(getPuzzlesForSelection(catalog, { difficulty, category }));
      })
      .catch(() => { if (isActive) setError('Unable to load puzzles.'); })
      .finally(() => { if (isActive) setIsLoading(false); });

    return () => { isActive = false; };
  }, [category, difficulty]));

  return (
    <PuzzleSelectionLayout
      title="Choose puzzle"
      subtitle={`${humanizeCatalogValue(difficulty)} · ${humanizeCatalogValue(category)}`}
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
          supportingText={humanizeCatalogValue(puzzle.category)}
          imageUrl={puzzle.imageURL}
          onPress={() => navigation.push('Puzzle', { puzzleId: puzzle.imageId })}
        />
      ))}
    </PuzzleSelectionLayout>
  );
}