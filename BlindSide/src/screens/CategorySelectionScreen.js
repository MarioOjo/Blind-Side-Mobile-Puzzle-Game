// Lists fixed categories with real counts and routes empty choices to the coming-soon state.
import { useCallback, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import PuzzleSelectionLayout from '../components/PuzzleSelectionLayout';
import PuzzleSelectionRow from '../components/PuzzleSelectionRow';
import { getPuzzleImages } from '../services/FirestoreService';
import {
  getAvailableCategories,
  getCategoryRoute,
  humanizeCatalogValue,
  normalizeCatalogValue,
} from '../utils/puzzleCatalog';

export default function CategorySelectionScreen({ navigation, route }) {
  const { width, height } = useWindowDimensions();
  const difficulty = normalizeCatalogValue(route.params?.difficulty);
  const [puzzles, setPuzzles] = useState([]);
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    let isActive = true;
    setIsLoading(true);
    setError('');

    if (!difficulty) {
      setError('Choose a difficulty before selecting a category.');
      setIsLoading(false);
      return () => { isActive = false; };
    }

    getPuzzleImages()
      .then((catalog) => {
        if (!isActive) return;
        setPuzzles(catalog);
        setOptions(getAvailableCategories(catalog, difficulty));
      })
      .catch(() => { if (isActive) setError('Unable to load puzzle categories.'); })
      .finally(() => { if (isActive) setIsLoading(false); });

    return () => { isActive = false; };
  }, [difficulty]));

  const handleCategoryPress = (category) => {
    const destination = getCategoryRoute(puzzles, difficulty, category);
    if (destination) navigation.push(destination.screen, destination.params);
  };

  return (
    <PuzzleSelectionLayout
      title="Choose category"
      subtitle={`${humanizeCatalogValue(difficulty)} puzzles`}
      isLoading={isLoading}
      error={error}
      isEmpty={options.length === 0}
      emptyMessage="No categories are available for this difficulty."
      isLandscape={width > height}
    >
      {options.map((option) => (
        <PuzzleSelectionRow
          key={option.key}
          label={option.label}
          supportingText={`${option.count} ${option.count === 1 ? 'puzzle' : 'puzzles'}`}
          icon={option.icon}
          onPress={() => handleCategoryPress(option.key)}
        />
      ))}
    </PuzzleSelectionLayout>
  );
}