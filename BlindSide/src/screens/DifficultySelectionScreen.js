// Lists the fixed difficulty structure with current puzzle counts, including zero-count levels.
import { useCallback, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import PuzzleSelectionLayout from '../components/PuzzleSelectionLayout';
import PuzzleSelectionRow from '../components/PuzzleSelectionRow';
import { getPuzzleImages } from '../services/FirestoreService';
import { getAvailableDifficulties } from '../utils/puzzleCatalog';

export default function DifficultySelectionScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    let isActive = true;
    setIsLoading(true);
    setError('');

    getPuzzleImages()
      .then((puzzles) => { if (isActive) setOptions(getAvailableDifficulties(puzzles)); })
      .catch(() => { if (isActive) setError('Unable to load puzzle difficulties.'); })
      .finally(() => { if (isActive) setIsLoading(false); });

    return () => { isActive = false; };
  }, []));

  return (
    <PuzzleSelectionLayout
      title="Choose difficulty"
      isLoading={isLoading}
      error={error}
      isEmpty={options.length === 0}
      emptyMessage="No puzzles are available right now."
      isLandscape={width > height}
    >
      {options.map((option) => (
        <PuzzleSelectionRow
          key={option.key}
          label={option.label}
          supportingText={`${option.count} ${option.count === 1 ? 'puzzle' : 'puzzles'}`}
          icon={option.icon}
          onPress={() => navigation.push('CategorySelection', { difficulty: option.key })}
        />
      ))}
    </PuzzleSelectionLayout>
  );
}