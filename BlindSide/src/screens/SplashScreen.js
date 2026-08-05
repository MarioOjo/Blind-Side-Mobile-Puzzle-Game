import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Corner pieces of the assembled puzzle mark, translated from the design spec's SVG paths.
// Drawn body-first so the navy notch cutout (added separately below) paints on top of it.
const PIECES = [
  { d: 'M70 30 L 70 70 L 30 70 L 30 30 Z', originX: 50, originY: 50, fromX: 65, fromY: -65, fromRotate: 90, startDelay: 70 },
  { d: 'M40 30 C 40 20, 60 20, 60 30 L 60 35 L 40 35 Z', originX: 50, originY: 27, fromX: 0, fromY: -65, fromRotate: -90, startDelay: 0 },
  { d: 'M40 70 C 40 80, 60 80, 60 70 L 60 65 L 40 65 Z', originX: 50, originY: 72, fromX: -65, fromY: 65, fromRotate: 45, startDelay: 140 },
  { d: 'M30 40 L 35 40 C 45 40, 45 60, 35 60 L 30 60 Z', originX: 37, originY: 50, fromX: 65, fromY: 65, fromRotate: -45, startDelay: 210 },
];

const PIECE_DURATION = 440;
const NOTCH_DELAY = 600;
const NOTCH_DURATION = 200;
const TITLE_DELAY = 750;
const TITLE_DURATION = 350;
const TAGLINE_DELAY = 1000;
const TAGLINE_DURATION = 350;
const PROGRESS_DELAY = 900;
const PROGRESS_DURATION = 1300;
const FINISH_DELAY = 2200;

export default function SplashScreen({ onFinish }) {
  const pieceDrivers = useRef(PIECES.map(() => new Animated.Value(0))).current;
  const notchOpacity = useRef(new Animated.Value(0)).current;
  const titleDriver = useRef(new Animated.Value(0)).current;
  const taglineDriver = useRef(new Animated.Value(0)).current;
  const progressDriver = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pieceAnimations = PIECES.map((piece, index) =>
      Animated.timing(pieceDrivers[index], {
        toValue: 1,
        duration: PIECE_DURATION,
        delay: piece.startDelay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      })
    );

    Animated.parallel([
      ...pieceAnimations,
      Animated.timing(notchOpacity, {
        toValue: 1,
        duration: NOTCH_DURATION,
        delay: NOTCH_DELAY,
        useNativeDriver: false,
      }),
      Animated.timing(titleDriver, {
        toValue: 1,
        duration: TITLE_DURATION,
        delay: TITLE_DELAY,
        useNativeDriver: false,
      }),
      Animated.timing(taglineDriver, {
        toValue: 1,
        duration: TAGLINE_DURATION,
        delay: TAGLINE_DELAY,
        useNativeDriver: false,
      }),
      Animated.timing(progressDriver, {
        toValue: 1,
        duration: PROGRESS_DURATION,
        delay: PROGRESS_DELAY,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]).start();

    // Fixed timeout drives the handoff to Login — no auth/data-readiness check.
    const finishTimer = setTimeout(() => onFinish?.(), FINISH_DELAY);
    return () => clearTimeout(finishTimer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.svgWrapper, shadows.glowCyan]}>
        <Svg width={120} height={120} viewBox="0 0 100 100">
          {PIECES.map((piece, index) => {
            const driver = pieceDrivers[index];
            const translateX = driver.interpolate({ inputRange: [0, 1], outputRange: [piece.fromX, 0] });
            const translateY = driver.interpolate({ inputRange: [0, 1], outputRange: [piece.fromY, 0] });
            const rotation = driver.interpolate({ inputRange: [0, 1], outputRange: [piece.fromRotate, 0] });
            return (
              <AnimatedG
                key={piece.d}
                translateX={translateX}
                translateY={translateY}
                rotation={rotation}
                originX={piece.originX}
                originY={piece.originY}
                opacity={driver}
              >
                <Path d={piece.d} fill={colors.neonCyan} />
              </AnimatedG>
            );
          })}
          <AnimatedPath
            d="M70 40 L 65 40 C 55 40, 55 60, 65 60 L 70 60 L 70 40 Z"
            fill={colors.midnightNavy}
            opacity={notchOpacity}
          />
        </Svg>
      </Animated.View>

      <Animated.Text
        style={[
          styles.title,
          {
            opacity: titleDriver,
            transform: [{ translateY: titleDriver.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          },
        ]}
      >
        BLINDSIDE
      </Animated.Text>
      <Animated.Text style={[styles.tagline, { opacity: taglineDriver }]}>Race. Reveal. Challenge.</Animated.Text>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: progressDriver.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.midnightNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgWrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    color: colors.white,
    fontFamily: typography.logo,
    fontSize: 24,
    letterSpacing: 4,
  },
  tagline: {
    color: colors.neonCyan,
    fontFamily: typography.body,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 12,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 64,
    width: 128,
    height: 3,
    borderRadius: 999,
    backgroundColor: `${colors.electricBlue}33`,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.neonCyan,
  },
});
