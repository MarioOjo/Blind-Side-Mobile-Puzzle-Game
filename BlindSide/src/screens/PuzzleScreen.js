// Loads the selected puzzle and gates the interactive jigsaw board behind landscape orientation.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import JigsawBoard from '../components/JigsawBoard';
import CooperativeTurnOverlay from '../components/CooperativeTurnOverlay';
import { auth } from '../services/FirebaseConfig';
import {
  createCooperativeSession,
  createSoloCompletion,
  getPuzzleImage,
  getQuestionsForTier,
  getSoloPersonalBest,
  updateCooperativeSession,
} from '../services/FirestoreService';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';
import { applyGlobalOrientationPolicy } from '../utils/orientationPolicy';
import { comparePersonalBest, normalizeElapsedTime } from '../utils/soloRun';
import { isValidCooperativeContext } from '../utils/cooperativeCatalog';
import { getCooperativeDifficultyLayout } from '../utils/jigsaw';
import {
  advancePlayer,
  buildTurnState,
  confirmQuestion,
  isQuestionFullyConfirmed,
  recordCorrectPlacement,
  skipQuestion,
} from '../utils/cooperativeTurn';

// ─── helpers ────────────────────────────────────────────────────────────────

function isLandscapeOrientation(orientation) {
  return (
    orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT
    || orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
  );
}


// ─── component ──────────────────────────────────────────────────────────────

export default function PuzzleScreen({ navigation, route }) {
  const puzzleId = route.params?.puzzleId;
  const isCooperative = isValidCooperativeContext(route.params);

  // ── orientation ──
  const [orientation, setOrientation] = useState(null);
  const isLandscape = isLandscapeOrientation(orientation);

  // ── puzzle load ──
  const [puzzle, setPuzzle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [imageError, setImageError] = useState(false);
  const handleImageError = useCallback(() => setImageError(true), []);

  // ── shared timer (wall-clock, never pauses) ──
  const [elapsedTime, setElapsedTime] = useState(0);
  const startedAt = useRef(null);
  const timerInterval = useRef(null);
  const completionHandled = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    timerInterval.current = null;
  }, []);

  // ── cooperative session ──
  const cooperativeSessionId = useRef(null);
  const cooperativeSessionCreatePromise = useRef(null);
  const [questions, setQuestions] = useState([]);
  // turnPhase: null | 'confirming' | 'question' | 'complete'
  // 'confirming' — current player taps to unlock the board (turn 1 and every handoff)
  // null         — board is active for currentPlayerIndex
  // 'question'   — both players confirm the relationship question
  // 'complete'   — puzzle finished
  // Cooperative starts in 'confirming' so Player 1 must tap before the board activates.
  const [turnPhase, setTurnPhase] = useState('confirming');
  const [turnState, setTurnState] = useState(null);
  // Total piece count is known once geometry is ready; JigsawBoard reports it
  // via onComplete, but we need it earlier for the "is this the final piece?"
  // check. We store it when JigsawBoard first reports geometry via a new prop.
  const totalPiecesRef = useRef(null);
  const placedCountRef = useRef(0);

  // ── solo timer start (cooperative uses handleConfirmReceipt) ──
  const handleFirstInteraction = useCallback(() => {
    if (isCooperative || startedAt.current !== null || completionHandled.current) return;
    startedAt.current = Date.now();
    setElapsedTime(0);
    timerInterval.current = setInterval(() => {
      setElapsedTime(Date.now() - startedAt.current);
    }, 250);
  }, [isCooperative]);

  // ── cooperative: current player confirms they have the device, unlocking the board ──
  const handleConfirmReceipt = useCallback(() => {
    if (!isCooperative || completionHandled.current) return;

    // Start the wall-clock timer on the very first confirm of the session.
    if (startedAt.current === null) {
      startedAt.current = Date.now();
      timerInterval.current = setInterval(() => {
        setElapsedTime(Date.now() - startedAt.current);
      }, 250);

      // Create the Firestore session document on first confirm.
      const uid = auth.currentUser?.uid;
      const partnerId = route.params?.partnerId;
      const tier = route.params?.tier;
      if (uid && partnerId && tier) {
        cooperativeSessionCreatePromise.current = createCooperativeSession({
          partnerIds: [uid, partnerId],
          puzzleId,
          tier,
          status: 'inProgress',
          movesTaken: 0,
          piecesPlacedTogether: 0,
          questionsAnswered: 0,
          questionsSkipped: 0,
          turnCount: 0,
        })
          .then((id) => { cooperativeSessionId.current = id; return id; })
          .catch(() => null);
      }
    }

    setTurnPhase(null);
  }, [isCooperative, puzzleId, route.params]);

  // ── cooperative: correct non-final placement ──
  const handleCoopCorrectPlacement = useCallback((nextTurnState) => {
    const elapsed = startedAt.current !== null ? Date.now() - startedAt.current : 0;

    // Checkpoint Firestore (best-effort, fire-and-forget).
    if (cooperativeSessionId.current) {
      updateCooperativeSession(cooperativeSessionId.current, {
        piecesPlacedTogether: nextTurnState.placedCount,
        turnCount: nextTurnState.turnCount,
        questionsAnswered: nextTurnState.questionsAnswered,
        questionsSkipped: nextTurnState.questionsSkipped,
        completionTime: normalizeElapsedTime(elapsed),
      }).catch(() => {});
    }

    if (nextTurnState.activeQuestion) {
      setTurnPhase('question');
    } else {
      setTurnState((current) => advancePlayer(current));
      setTurnPhase('confirming');
    }
  }, []);

  // ── JigsawBoard onSettle callback (cooperative only) ──
  const handleCoopSettle = useCallback((pieceId) => {
    if (!isCooperative || completionHandled.current) return;

    placedCountRef.current += 1;
    const isFinal = totalPiecesRef.current !== null
      && placedCountRef.current >= totalPiecesRef.current;

    // Final placement is handled by onComplete — skip turn logic.
    if (isFinal) return;

    setTurnState((current) => {
      const next = recordCorrectPlacement(current, questions, false);
      handleCoopCorrectPlacement(next);
      return next;
    });
  }, [handleCoopCorrectPlacement, isCooperative, questions]);

  // ── puzzle complete ──
  const handlePuzzleComplete = useCallback(async () => {
    if (completionHandled.current || !puzzle) return;
    completionHandled.current = true;

    if (isCooperative) {
      clearTimer();
      const elapsed = startedAt.current !== null
        ? normalizeElapsedTime(Date.now() - startedAt.current)
        : 0;

      // Ensure the session document exists before writing completion.
      // If the create promise is still in-flight, await it now.
      if (cooperativeSessionCreatePromise.current && !cooperativeSessionId.current) {
        await cooperativeSessionCreatePromise.current;
      }

      if (cooperativeSessionId.current) {
        try {
          await updateCooperativeSession(cooperativeSessionId.current, {
            status: 'completed',
            completionTime: elapsed,
            completedAt: new Date(),
            piecesPlacedTogether: totalPiecesRef.current ?? placedCountRef.current,
            turnCount: turnState?.turnCount ?? 0,
            questionsAnswered: turnState?.questionsAnswered ?? 0,
            questionsSkipped: turnState?.questionsSkipped ?? 0,
          });
        } catch (writeError) {
          console.error('Cooperative completion write failed:', writeError?.message ?? writeError);
        }
      }

      navigation.replace('CooperativeCompletion', {
        puzzleId,
        puzzleName: puzzle.imageName,
        completionTime: elapsed,
        turnCount: turnState?.turnCount ?? 0,
        questionsAnswered: turnState?.questionsAnswered ?? 0,
        questionsSkipped: turnState?.questionsSkipped ?? 0,
        partnerId: route.params?.partnerId,
        partnerName: route.params?.partnerName ?? 'Partner',
        tier: route.params?.tier,
      });
      return;
    }

    // ── solo path (unchanged) ──
    const completionTime = normalizeElapsedTime(
      startedAt.current === null ? 0 : Date.now() - startedAt.current,
    );
    clearTimer();
    setElapsedTime(completionTime);

    const baseResults = {
      puzzleId,
      puzzleName: puzzle.imageName,
      difficulty: puzzle.difficultyRecommended,
      category: puzzle.category,
      completionTime,
    };

    const uid = auth.currentUser?.uid;
    let comparison = { isPersonalBest: false, priorBestTime: null, improvement: null };
    let bestUnavailable = false;
    let sessionId = null;
    let saveError = false;

    if (uid) {
      try {
        const priorBest = await getSoloPersonalBest(uid, puzzleId);
        comparison = comparePersonalBest(completionTime, priorBest?.completionTime);
      } catch (error) {
        bestUnavailable = true;
      }

      try {
        sessionId = await createSoloCompletion({
          userId: uid,
          puzzleId,
          difficulty: puzzle.difficultyRecommended,
          category: puzzle.category,
          completionTime,
          movesTaken: 0,
        });
      } catch (error) {
        saveError = true;
      }
    } else {
      saveError = true;
      bestUnavailable = true;
    }

    navigation.replace('SoloCompletion', {
      ...baseResults,
      ...comparison,
      bestUnavailable,
      sessionId,
      saveError,
    });
  }, [clearTimer, isCooperative, navigation, puzzle, puzzleId, turnState]);

  // ── question skip: either player taps alone, no second confirm needed ──
  const handleSkipQuestion = useCallback(() => {
    setTurnState((current) => skipQuestion(current));
    setTurnPhase('confirming');
  }, []);

  // ── question confirmation ──
  const handleConfirmQuestion = useCallback((playerIndex) => {
    setTurnState((current) => {
      const next = confirmQuestion(current, playerIndex);
      if (isQuestionFullyConfirmed(next)) {
        // Advance player here so 'confirming' immediately shows the next player's name.
        const advanced = advancePlayer(next);
        setTurnPhase('confirming');
        return advanced;
      }
      return next;
    });
  }, []);

  // ── orientation subscription ──
  useEffect(() => {
    let isMounted = true;
    let orientationRevision = 0;

    const orientationSubscription = ScreenOrientation.addOrientationChangeListener((event) => {
      orientationRevision += 1;
      const next = event.orientationInfo.orientation;
      if (isMounted) setOrientation(next);
    });

    const readInitialOrientation = async () => {
      const revisionAtRequest = orientationRevision;
      try {
        const current = await ScreenOrientation.getOrientationAsync();
        if (isMounted && orientationRevision === revisionAtRequest) setOrientation(current);
      } catch (error) {}
    };

    readInitialOrientation();
    return () => {
      isMounted = false;
      orientationSubscription.remove();
      applyGlobalOrientationPolicy().catch(() => {});
    };
  }, []);

  // ── puzzle load ──
  useEffect(() => {
    let isActive = true;

    const loadPuzzle = async () => {
      setIsLoading(true);
      setLoadError('');
      setPuzzle(null);
      setImageError(false);

      try {
        if (!puzzleId) throw new Error('A puzzle selection is required.');
        const puzzleImage = await getPuzzleImage(puzzleId);
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
  }, [puzzleId]);

  // ── cooperative setup: load questions + init turn state ──
  useEffect(() => {
    if (!isCooperative) return;

    const tier = route.params?.tier;
    const partnerAName = route.params?.partnerName ?? 'Partner 1';
    const uid = auth.currentUser?.uid;

    // We need the signed-in user's display name for Player A.
    // Fall back to 'You' if the profile isn't available here.
    const playerAName = 'You';
    const playerBName = partnerAName;

    setTurnState(buildTurnState(playerAName, playerBName));
    placedCountRef.current = 0;
    totalPiecesRef.current = null;

    if (tier) {
      getQuestionsForTier(tier)
        .then((fetched) => setQuestions(fetched))
        .catch(() => setQuestions([]));
    }
  }, [isCooperative, puzzleId, route.params]);

  // ── reset on puzzle change ──
  useEffect(() => {
    clearTimer();
    startedAt.current = null;
    completionHandled.current = false;
    cooperativeSessionId.current = null;
    cooperativeSessionCreatePromise.current = null;
    placedCountRef.current = 0;
    totalPiecesRef.current = null;
    setElapsedTime(0);
    setTurnPhase(isCooperative ? 'confirming' : null);
    return clearTimer;
  }, [clearTimer, isCooperative, puzzleId]);

  // ── derive total piece count from layout so we can detect the final piece ──
  const layoutOverride = isCooperative
    ? getCooperativeDifficultyLayout(puzzle?.difficultyRecommended)
    : null;

  useEffect(() => {
    if (layoutOverride) {
      totalPiecesRef.current = layoutOverride.pieceCount;
    }
  }, [layoutOverride]);

  // ── board is non-interactive during confirming/question phases ──
  const boardDisabled = isCooperative
    && (turnPhase === 'confirming' || turnPhase === 'question');

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
        <JigsawBoard
          puzzle={puzzle}
          layoutOverride={layoutOverride}
          elapsedTime={elapsedTime}
          showTimer={!isCooperative}
          disabled={boardDisabled}
          onFirstInteraction={isCooperative ? undefined : handleFirstInteraction}
          onComplete={handlePuzzleComplete}
          onSettle={isCooperative ? handleCoopSettle : undefined}
          onImageError={handleImageError}
        />
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

      {isLandscape && isCooperative && turnState && turnPhase !== null && turnPhase !== 'complete' ? (
        <CooperativeTurnOverlay
          phase={turnPhase}
          partnerNames={turnState.partnerNames}
          currentPlayerIndex={turnState.currentPlayerIndex}
          activeQuestion={turnState.activeQuestion}
          questionConfirmedBy={turnState.questionConfirmedBy}
          onConfirmReceipt={handleConfirmReceipt}
          onConfirmQuestion={handleConfirmQuestion}
          onSkipQuestion={handleSkipQuestion}
        />
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
