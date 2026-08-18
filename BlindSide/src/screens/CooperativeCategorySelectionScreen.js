// Shows fixed real categories with Hard cooperative puzzle counts and context-aware routing.
import { useCallback, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import PuzzleSelectionLayout from '../components/PuzzleSelectionLayout';
import PuzzleSelectionRow from '../components/PuzzleSelectionRow';
import { getPuzzleImages } from '../services/FirestoreService';
import {
  createCooperativeContext,
  getCooperativeCategories,
  getCooperativeCategoryRoute,
  isValidCooperativeContext,
} from '../utils/cooperativeCatalog';
import { humanizeCatalogValue } from '../utils/puzzleCatalog';

export default function CooperativeCategorySelectionScreen({ navigation, route }) {
  const { width, height } = useWindowDimensions();
  const context = createCooperativeContext(route.params);
  const contextIsValid = isValidCooperativeContext(context);
  const [puzzles, setPuzzles] = useState([]);
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(contextIsValid);
  const [error, setError] = useState(
    contextIsValid ? '' : 'Choose a partner and tier before selecting a category.',
  );

  useFocusEffect(useCallback(() => {
    let isActive = true;
    if (!contextIsValid) return () => { isActive = false; };
    setIsLoading(true);
    setError('');

    getPuzzleImages()
      .then((catalog) => {
        if (!isActive) return;
        setPuzzles(catalog);
        setOptions(getCooperativeCategories(catalog));
      })
      .catch(() => { if (isActive) setError('Unable to load cooperative categories.'); })
      .finally(() => { if (isActive) setIsLoading(false); });

    return () => { isActive = false; };
  }, [context.partnerId, context.tier, contextIsValid]));

  return (
    <PuzzleSelectionLayout
      title="Choose category"
      subtitle={`${humanizeCatalogValue(context.tier)} · Hard`}
      isLoading={isLoading}
      error={error}
      isEmpty={options.length === 0}
      emptyMessage="More puzzles coming soon"
      isLandscape={width > height}
    >
      {options.map((option) => (
        <PuzzleSelectionRow
          key={option.key}
          label={option.label}
          supportingText={`${option.count} ${option.count === 1 ? 'puzzle' : 'puzzles'}`}
          icon={option.icon}
          onPress={() => {
            const destination = getCooperativeCategoryRoute(puzzles, context, option.key);
            navigation.push(destination.screen, destination.params);
          }}
        />
      ))}
    </PuzzleSelectionLayout>
  );
}