import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { getPuzzleImage } from '../services/FirestoreService';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';

const GAMEPLAY_PUZZLE_ID = 'places-santorini';

export default function PuzzleScreen() {
  const { width, height } = useWindowDimensions();
  const isPortrait = width <= height;
  const [puzzle, setPuzzle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const lockLandscape = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        if (!isMounted) await ScreenOrientation.unlockAsync();
      } catch (error) {}
    };

    lockLandscape();
    return () => {
      isMounted = false;
      ScreenOrientation.unlockAsync().catch(() => {});
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
      <View style={[styles.boardFrame, shadows.glowCyan]}>
        {isLoading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={colors.neonCyan} />
            <Text style={styles.stateText}>Loading puzzle...</Text>
          </View>
        ) : null}

        {!isLoading && loadError ? (
          <View style={styles.centeredState}>
            <Ionicons name="cloud-offline-outline" size={34} color={colors.neonCyan} />
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : null}

        {!isLoading && puzzle && !imageError ? (
          <Image
            source={{ uri: puzzle.imageURL }}
            style={styles.puzzleImage}
            resizeMode="contain"
            onError={() => setImageError(true)}
            accessibilityLabel={puzzle.imageName}
          />
        ) : null}

        {!isLoading && puzzle && imageError ? (
          <View style={styles.centeredState}>
            <Ionicons name="image-outline" size={34} color={colors.neonCyan} />
            <Text style={styles.errorText}>The puzzle image could not be displayed.</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.detailsPanel}>
        <Text style={styles.eyebrow}>COOPERATIVE PUZZLE</Text>
        <Text style={styles.title}>{puzzle?.imageName ?? 'Puzzle Board'}</Text>
        <View style={styles.divider} />
        <View style={styles.detailRow}>
          <Ionicons name="images-outline" size={18} color={colors.neonCyan} />
          <View style={styles.detailCopy}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{puzzle?.category ?? 'Loading'}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="speedometer-outline" size={18} color={colors.victoryGold} />
          <View style={styles.detailCopy}>
            <Text style={styles.detailLabel}>Recommended</Text>
            <Text style={styles.detailValue}>{puzzle?.difficultyRecommended ?? 'Loading'}</Text>
          </View>
        </View>
        <Text style={styles.stageLabel}>Board preview</Text>
      </View>

      {isPortrait ? (
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
    flexDirection: 'row',
    gap: 16,
    padding: 16,
  },
  boardFrame: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    backgroundColor: '#080D18',
    borderWidth: 1.5,
    borderColor: colors.neonCyan,
    borderRadius: 12,
  },
  puzzleImage: {
    width: '100%',
    height: '100%',
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
  detailsPanel: {
    width: 220,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.electricBlue,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  eyebrow: {
    color: colors.neonCyan,
    fontFamily: typography.subheading,
    fontSize: 10,
  },
  title: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailCopy: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: typography.body,
    fontSize: 10,
  },
  detailValue: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  stageLabel: {
    marginTop: 'auto',
    color: colors.neonCyan,
    fontFamily: typography.body,
    fontSize: 11,
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

