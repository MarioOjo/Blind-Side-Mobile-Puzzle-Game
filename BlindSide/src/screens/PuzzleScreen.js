// Loads the selected puzzle and gates the interactive jigsaw board behind landscape orientation.
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import JigsawBoard from '../components/JigsawBoard';
import { getPuzzleImage } from '../services/FirestoreService';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';
import { applyGlobalOrientationPolicy } from '../utils/orientationPolicy';

const GAMEPLAY_PUZZLE_ID = 'places-santorini';

export default function PuzzleScreen() {
  const [orientation, setOrientation] = useState(null);
  const isLandscape = orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT
    || orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
  const [puzzle, setPuzzle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [imageError, setImageError] = useState(false);
  const handleImageError = useCallback(() => setImageError(true), []);

  useEffect(() => {
    let isMounted = true;
    let orientationRevision = 0;

    const orientationSubscription = ScreenOrientation.addOrientationChangeListener((event) => {
      orientationRevision += 1;
      if (isMounted) setOrientation(event.orientationInfo.orientation);
    });

    const readInitialOrientation = async () => {
      const revisionAtRequest = orientationRevision;

      try {
        const currentOrientation = await ScreenOrientation.getOrientationAsync();
        if (isMounted && orientationRevision === revisionAtRequest) {
          setOrientation(currentOrientation);
        }
      } catch (error) {}
    };

    readInitialOrientation();
    return () => {
      isMounted = false;
      orientationSubscription.remove();
      applyGlobalOrientationPolicy().catch(() => {});
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadPuzzle = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const puzzleImage = await getPuzzleImage(GAMEPLAY_PUZZLE_ID);
        if (!puzzleImage) throw new Error('Puzzle image not found.');
        if (isActive) setPuzzle(puzzleImage);
      } catch (error) {
        if (isActive) setLoadError('Unable to load the puzzle image. Please try again later.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadPuzzle();
    return () => { isActive = false; };
  }, []);

  return (
    <View style={styles.container}>
      {isLandscape && isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.neonCyan} />
          <Text style={styles.stateText}>Loading puzzle...</Text>
        </View>
      ) : null}

      {isLandscape && !isLoading && loadError ? (
        <View style={styles.centeredState}>
          <Ionicons name="cloud-offline-outline" size={34} color={colors.neonCyan} />
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : null}

      {isLandscape && !isLoading && puzzle && !imageError ? (
        <JigsawBoard puzzle={puzzle} onImageError={handleImageError} />
      ) : null}

      {isLandscape && !isLoading && puzzle && imageError ? (
        <View style={styles.centeredState}>
          <Ionicons name="image-outline" size={34} color={colors.neonCyan} />
          <Text style={styles.errorText}>The puzzle image could not be displayed.</Text>
        </View>
      ) : null}

      {!isLandscape ? (
        <View style={styles.orientationOverlay}>
          <View style={[styles.orientationPrompt, shadows.glowCyan]}>
            <Ionicons name="phone-landscape-outline" size={52} color={colors.neonCyan} />
            <Text style={styles.orientationTitle}>Rotate Device</Text>
            <Text style={styles.orientationText}>This puzzle is played in landscape.</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnightNavy,
    padding: 16,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  stateText: {
    color: 'rgba(255,255,255,0.68)',
    fontFamily: typography.body,
    fontSize: 13,
  },
  errorText: {
    color: colors.white,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  orientationOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    elevation: 20,
    backgroundColor: 'rgba(15,23,42,0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  orientationPrompt: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.neonCyan,
    borderRadius: 12,
    padding: 24,
  },
  orientationTitle: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 22,
  },
  orientationText: {
    color: 'rgba(255,255,255,0.68)',
    fontFamily: typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
});

