// Loads the selected puzzle and gates the interactive jigsaw board behind landscape orientation.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { arrayUnion } from 'firebase/firestore';
import JigsawBoard from '../components/JigsawBoard';
import CooperativeTurnOverlay from '../components/CooperativeTurnOverlay';
import CooperativeOnboardingOverlay from '../components/CooperativeOnboardingOverlay';
import ExitConfirmOverlay from '../components/ExitConfirmOverlay';
import { auth } from '../services/FirebaseConfig';
import {
  createCooperativeSession,
  createSoloCompletion,
  createSoloSession,
  getCooperativeSession,
  getPuzzleImage,
  getQuestionsForTier,
  getSoloPersonalBest,
  getSoloSession,
  updateCooperativeSession,
  updateSoloSession,
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
  const sessionIdParam = route.params?.sessionId;
  // Board and tray tile the entire workspace with no dead space in either
  // orientation, so the pause icon unavoidably overlaps something — insets
  // guard it from also sitting under Android's gesture/nav bar, which can be
  // on either the left or bottom edge depending on landscape rotation.
  const insets = useSafeAreaInsets();

  // ── orientation ──
  const [orientation, setOrientation] = useState(null);
  const isLandscape = isLandscapeOrientation(orientation);

  // ── puzzle load ──
  const [puzzle, setPuzzle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [imageError, setImageError] = useState(false);
  const handleImageError = useCallback(() => setImageError(true), []);

  // ── resuming an existing cooperative session (sessionId route param) ──
  const [isResumeLoading, setIsResumeLoading] = useState(Boolean(sessionIdParam));
  const [initialPlacedPieceIds, setInitialPlacedPieceIds] = useState(null);
  // Elapsed time already on the clock when a resumed session was last saved,
  // so the wall-clock timer continues instead of restarting from zero.
  const resumedElapsedRef = useRef(0);

  // ── exit confirmation (hardware back, header back arrow, Pause icon) ──
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Every placement already autosaves (placedPieceIds), so leaving is always
  // safe — this flag just lets our own intentional navigations (Save & Exit,
  // and normal puzzle completion) through the beforeRemove intercept below
  // without re-triggering the confirmation on themselves.
  const allowLeaveRef = useRef(false);

  // ── shared timer (wall-clock, never pauses) ──
  const [elapsedTime, setElapsedTime] = useState(0);
  const startedAt = useRef(null);
  const timerInterval = useRef(null);
  const completionHandled = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    timerInterval.current = null;
  }, []);

  // ── solo session (created on first interaction, checkpointed per placement) ──
  const soloSessionId = useRef(null);
  const soloSessionCreatePromise = useRef(null);

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
  // One-time explainer shown before this user's very first cooperative turn card ever.
  const [showCoopOnboarding, setShowCoopOnboarding] = useState(false);
  // Total piece count is known once geometry is ready; JigsawBoard reports it
  // via onComplete, but we need it earlier for the "is this the final piece?"
  // check. We store it when JigsawBoard first reports geometry via a new prop.
  const totalPiecesRef = useRef(null);
  const placedCountRef = useRef(0);
  // Local mirror of every placed piece ID this session, so the final piece
  // (which skips handleCoopCorrectPlacement's per-placement checkpoint) can
  // still be included in the completion write.
  const placedPieceIdsRef = useRef([]);

  useEffect(() => {
    if (!isCooperative) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    let cancelled = false;
    AsyncStorage.getItem(`coopOnboardingSeen:${uid}`)
      .then((value) => {
        if (!cancelled && value !== 'true') setShowCoopOnboarding(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isCooperative]);

  const handleDismissCoopOnboarding = useCallback(() => {
    setShowCoopOnboarding(false);
    const uid = auth.currentUser?.uid;
    if (uid) AsyncStorage.setItem(`coopOnboardingSeen:${uid}`, 'true').catch(() => {});
  }, []);

  // ── exit confirmation: intercept hardware back / header back arrow ──
  // beforeRemove fires for every way a screen can leave the stack — Android
  // hardware back, the native-stack header's back arrow, and any programmatic
  // goBack()/navigate() that would pop this screen — so one listener covers
  // both things the task calls out (hardware back and "an in-app back arrow
  // if one exists") without needing a separate BackHandler subscription.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowLeaveRef.current) return;
      event.preventDefault();
      setShowExitConfirm(true);
    });
    return unsubscribe;
  }, [navigation]);

  // ── exit confirmation: Pause icon (works even during the 'confirming' phase) ──
  const handleRequestExit = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  const handleResumePlay = useCallback(() => {
    setShowExitConfirm(false);
  }, []);

  const handleSaveAndExit = useCallback(() => {
    setShowExitConfirm(false);
    allowLeaveRef.current = true;
    navigation.navigate('HomeDashboard');
  }, [navigation]);

  // ── solo timer start + session creation (cooperative uses handleConfirmReceipt) ──
  const handleFirstInteraction = useCallback(() => {
    if (isCooperative || startedAt.current !== null || completionHandled.current) return;
    // Resumed sessions offset by however much time was already on the clock,
    // so the total keeps counting up instead of restarting from zero.
    startedAt.current = Date.now() - resumedElapsedRef.current;
    setElapsedTime(resumedElapsedRef.current);
    timerInterval.current = setInterval(() => {
      setElapsedTime(Date.now() - startedAt.current);
    }, 250);

    // Create the Firestore session document on first interaction — but only
    // for a brand-new session. A resumed session already has soloSessionId
    // set (from the resume fetch below), so creating one here would fork a
    // second document instead of continuing the existing one.
    if (!soloSessionId.current) {
      const uid = auth.currentUser?.uid;
      if (uid && puzzle) {
        soloSessionCreatePromise.current = createSoloSession({
          userId: uid,
          puzzleId,
          difficulty: puzzle.difficultyRecommended,
          category: puzzle.category,
          movesTaken: 0,
        })
          .then((id) => { soloSessionId.current = id; return id; })
          .catch(() => null);
      }
    }
  }, [isCooperative, puzzle, puzzleId]);

  // ── cooperative: current player confirms they have the device, unlocking the board ──
  const handleConfirmReceipt = useCallback(() => {
    if (!isCooperative || completionHandled.current) return;

    // Start the wall-clock timer on the very first confirm of the session.
    // Resumed sessions offset by however much time was already on the clock,
    // so the total keeps counting up instead of restarting from zero.
    if (startedAt.current === null) {
      startedAt.current = Date.now() - resumedElapsedRef.current;
      timerInterval.current = setInterval(() => {
        setElapsedTime(Date.now() - startedAt.current);
      }, 250);

      // Create the Firestore session document on first confirm — but only for
      // a brand-new session. A resumed session already has cooperativeSessionId
      // set (from the resume fetch below), so creating one here would fork a
      // second document instead of continuing the existing one.
      if (!cooperativeSessionId.current) {
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
    }

    setTurnPhase(null);
  }, [isCooperative, puzzleId, route.params]);

  // ── cooperative: correct non-final placement ──
  const handleCoopCorrectPlacement = useCallback((nextTurnState, pieceId) => {
    const elapsed = startedAt.current !== null ? Date.now() - startedAt.current : 0;

    // Checkpoint Firestore (best-effort, fire-and-forget). arrayUnion is safe
    // to call every placement — it's an atomic append, not a read-modify-write,
    // and piggybacks on the write this call already made before Phase 1.
    if (cooperativeSessionId.current) {
      updateCooperativeSession(cooperativeSessionId.current, {
        piecesPlacedTogether: nextTurnState.placedCount,
        turnCount: nextTurnState.turnCount,
        questionsAnswered: nextTurnState.questionsAnswered,
        questionsSkipped: nextTurnState.questionsSkipped,
        completionTime: normalizeElapsedTime(elapsed),
        placedPieceIds: arrayUnion(pieceId),
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

    placedPieceIdsRef.current.push(pieceId);
    placedCountRef.current += 1;
    const isFinal = totalPiecesRef.current !== null
      && placedCountRef.current >= totalPiecesRef.current;

    // Final placement is handled by onComplete — skip turn logic. The piece
    // ID is still captured above so the completion write below includes it.
    if (isFinal) return;

    setTurnState((current) => {
      const next = recordCorrectPlacement(current, questions, false);
      handleCoopCorrectPlacement(next, pieceId);
      return next;
    });
  }, [handleCoopCorrectPlacement, isCooperative, questions]);

  // ── JigsawBoard onSettle callback (solo only) ──
  const handleSoloSettle = useCallback((pieceId) => {
    if (isCooperative || completionHandled.current) return;

    placedPieceIdsRef.current.push(pieceId);

    // Checkpoint Firestore (best-effort, fire-and-forget) — same pattern as
    // the cooperative per-placement checkpoint, minus turn/question logic
    // since solo has neither.
    if (soloSessionId.current) {
      const elapsed = startedAt.current !== null ? Date.now() - startedAt.current : 0;
      updateSoloSession(soloSessionId.current, {
        placedPieceIds: arrayUnion(pieceId),
        completionTime: normalizeElapsedTime(elapsed),
      }).catch(() => {});
    }
  }, [isCooperative]);

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
            // Full overwrite (not arrayUnion): the final piece never went
            // through handleCoopCorrectPlacement's per-placement checkpoint,
            // so placedPieceIdsRef is the only complete record at this point.
            placedPieceIds: placedPieceIdsRef.current,
          });
        } catch (writeError) {
          console.error('Cooperative completion write failed:', writeError?.message ?? writeError);
        }
      }

      // Puzzle finished normally — not an exit, so bypass the confirmation intercept.
      allowLeaveRef.current = true;
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

      // Ensure the in-progress session document exists before writing
      // completion — if creation fired on first interaction and is still
      // in-flight, await it now.
      if (soloSessionCreatePromise.current && !soloSessionId.current) {
        await soloSessionCreatePromise.current;
      }

      try {
        if (soloSessionId.current) {
          // Update the same document the in-progress checkpoints wrote to,
          // rather than creating a second one.
          await updateSoloSession(soloSessionId.current, {
            status: 'completed',
            completionTime,
            completedAt: new Date(),
            placedPieceIds: placedPieceIdsRef.current,
          });
          sessionId = soloSessionId.current;
        } else {
          // No in-progress session was ever created (e.g. offline at first
          // interaction) — fall back to writing the completion directly.
          sessionId = await createSoloCompletion({
            userId: uid,
            puzzleId,
            difficulty: puzzle.difficultyRecommended,
            category: puzzle.category,
            completionTime,
            movesTaken: 0,
          });
        }
      } catch (error) {
        saveError = true;
      }
    } else {
      saveError = true;
      bestUnavailable = true;
    }

    // Puzzle finished normally — not an exit, so bypass the confirmation intercept.
    allowLeaveRef.current = true;
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
    placedPieceIdsRef.current = [];
    resumedElapsedRef.current = 0;
    setInitialPlacedPieceIds(null);

    if (tier) {
      getQuestionsForTier(tier)
        .then((fetched) => setQuestions(fetched))
        .catch(() => setQuestions([]));
    }

    if (!sessionIdParam) {
      setIsResumeLoading(false);
      return undefined;
    }

    // Resume path: load the existing session and pre-mark its placed pieces
    // instead of starting the puzzle fresh. JigsawBoard doesn't render until
    // isResumeLoading clears, so it always mounts with the correct initial
    // placed-piece set — no race between the board appearing and this fetch.
    let cancelled = false;
    setIsResumeLoading(true);

    getCooperativeSession(sessionIdParam)
      .then((session) => {
        if (cancelled || !session) return;

        cooperativeSessionId.current = session.id;
        const placedIds = Array.isArray(session.placedPieceIds) ? session.placedPieceIds : [];
        placedPieceIdsRef.current = [...placedIds];
        placedCountRef.current = placedIds.length;
        resumedElapsedRef.current = session.completionTime ?? 0;
        setInitialPlacedPieceIds(placedIds);
        setElapsedTime(resumedElapsedRef.current);

        const turnCount = session.turnCount ?? 0;
        setTurnState((current) => ({
          ...(current ?? buildTurnState(playerAName, playerBName)),
          placedCount: placedIds.length,
          turnCount,
          // currentPlayerIndex toggles once per completed turn in lockstep
          // with turnCount (see cooperativeTurn.js) — turnCount % 2 always
          // matches it, so it isn't a separate persisted field.
          currentPlayerIndex: turnCount % 2,
          questionsAnswered: session.questionsAnswered ?? 0,
          questionsSkipped: session.questionsSkipped ?? 0,
        }));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsResumeLoading(false);
      });

    return () => { cancelled = true; };
  }, [isCooperative, puzzleId, route.params, sessionIdParam]);

  // ── solo setup: resume an existing in-progress solo session ──
  useEffect(() => {
    if (isCooperative) return undefined;

    soloSessionId.current = null;
    soloSessionCreatePromise.current = null;
    placedCountRef.current = 0;
    placedPieceIdsRef.current = [];
    resumedElapsedRef.current = 0;
    setInitialPlacedPieceIds(null);

    if (!sessionIdParam) {
      setIsResumeLoading(false);
      return undefined;
    }

    // Resume path: load the existing session and pre-mark its placed pieces
    // instead of starting the puzzle fresh — mirrors the cooperative resume
    // path above. JigsawBoard doesn't render until isResumeLoading clears.
    let cancelled = false;
    setIsResumeLoading(true);

    getSoloSession(sessionIdParam)
      .then((session) => {
        if (cancelled || !session) return;

        soloSessionId.current = session.id;
        const placedIds = Array.isArray(session.placedPieceIds) ? session.placedPieceIds : [];
        placedPieceIdsRef.current = [...placedIds];
        placedCountRef.current = placedIds.length;
        resumedElapsedRef.current = session.completionTime ?? 0;
        setInitialPlacedPieceIds(placedIds);
        setElapsedTime(resumedElapsedRef.current);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsResumeLoading(false);
      });

    return () => { cancelled = true; };
  }, [isCooperative, puzzleId, sessionIdParam]);

  // ── reset on puzzle change ──
  useEffect(() => {
    clearTimer();
    startedAt.current = null;
    completionHandled.current = false;
    soloSessionId.current = null;
    soloSessionCreatePromise.current = null;
    cooperativeSessionId.current = null;
    cooperativeSessionCreatePromise.current = null;
    placedCountRef.current = 0;
    totalPiecesRef.current = null;
    placedPieceIdsRef.current = [];
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

      {isLandscape && !isLoading && isResumeLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.neonCyan} />
          <Text style={styles.stateText}>Resuming puzzle...</Text>
        </View>
      ) : null}

      {isLandscape && !isLoading && !isResumeLoading && loadError ? (
        <View style={styles.centeredState}>
          <Ionicons name="cloud-offline-outline" size={34} color={colors.neonCyan} />
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : null}

      {isLandscape && !isLoading && !isResumeLoading && puzzle && !imageError ? (
        <JigsawBoard
          puzzle={puzzle}
          layoutOverride={layoutOverride}
          elapsedTime={elapsedTime}
          showTimer={!isCooperative}
          disabled={boardDisabled}
          onFirstInteraction={isCooperative ? undefined : handleFirstInteraction}
          onComplete={handlePuzzleComplete}
          onSettle={isCooperative ? handleCoopSettle : handleSoloSettle}
          onImageError={handleImageError}
          initialPlacedIds={initialPlacedPieceIds ?? undefined}
        />
      ) : null}

      {isLandscape && !isLoading && !isResumeLoading && puzzle && imageError ? (
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

      {isLandscape && isCooperative && showCoopOnboarding ? (
        <CooperativeOnboardingOverlay onDismiss={handleDismissCoopOnboarding} />
      ) : null}

      {isLandscape && isCooperative && !showCoopOnboarding && !isResumeLoading && turnState && turnPhase !== null && turnPhase !== 'complete' ? (
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

      {isLandscape ? (
        // Above every other overlay (including the cooperative 'confirming'
        // card) so it's always reachable, not just via hardware/header back.
        // Board and tray tile the full workspace with no dead space, so this
        // unavoidably overlaps something — bottom-left of the board is the
        // least-bad spot: it overlaps the drop-target board rather than the
        // tray's page-nav controls or its actively-draggable piece tiles.
        <Pressable
          style={({ pressed }) => [
            styles.pauseButton,
            { bottom: 16 + insets.bottom, left: 16 + insets.left },
            pressed && styles.pauseButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Pause and exit options"
          onPress={handleRequestExit}
        >
          <Ionicons name="pause" size={20} color={colors.neonCyan} />
        </Pressable>
      ) : null}

      <ExitConfirmOverlay
        visible={showExitConfirm}
        isCooperative={isCooperative}
        partnerName={route.params?.partnerName ?? 'your partner'}
        onResume={handleResumePlay}
        onSaveAndExit={handleSaveAndExit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnightNavy,
    padding: 16,
  },
  pauseButton: {
    position: 'absolute',
    zIndex: 35,
    elevation: 35,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.neonCyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButtonPressed: {
    opacity: 0.7,
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
