// Renders one image-clipped jigsaw piece and owns its drag, snap, and spring-return behavior.
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, Image as SvgImage, Path } from 'react-native-svg';
import colors from '../theme/colors';

const SPRING_CONFIG = {
  damping: 24,
  stiffness: 260,
  mass: 0.7,
  overshootClamping: true,
};

export default function JigsawPiece({
  piece,
  imageUrl,
  boardWidth,
  boardHeight,
  origin,
  target,
  snapTolerance,
  onDragStart,
  onSettle,
}) {
  const translateX = useSharedValue(origin.x);
  const translateY = useSharedValue(origin.y);
  const startX = useSharedValue(origin.x);
  const startY = useSharedValue(origin.y);
  const isDragging = useSharedValue(false);
  const clipId = `clip-${piece.id}`;

  useEffect(() => {
    if (!isDragging.value) {
      translateX.value = origin.x;
      translateY.value = origin.y;
    }
  }, [isDragging, origin.x, origin.y, translateX, translateY]);

  const settlePiece = (placed) => {
    onSettle(piece.id, placed);
  };

  const gesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.value = true;
      startX.value = translateX.value;
      startY.value = translateY.value;
      runOnJS(onDragStart)();
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
    })
    .onFinalize((event, succeeded) => {
      const distance = Math.hypot(
        translateX.value - target.x,
        translateY.value - target.y,
      );
      const placed = succeeded && distance <= snapTolerance;
      const destinationX = placed ? target.x : origin.x;
      const destinationY = placed ? target.y : origin.y;

      translateX.value = withSpring(destinationX, SPRING_CONFIG);
      translateY.value = withSpring(destinationY, SPRING_CONFIG, (finished) => {
        if (finished) {
          isDragging.value = false;
          runOnJS(settlePiece)(placed);
        }
      });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    zIndex: isDragging.value ? 20 : 5,
    elevation: isDragging.value ? 20 : 5,
    transform: [
      { translateX: translateX.value - piece.padding },
      { translateY: translateY.value - piece.padding },
      { scale: isDragging.value ? 1.04 : 1 },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.piece,
          { width: piece.renderWidth, height: piece.renderHeight },
          animatedStyle,
        ]}
      >
        <Svg width={piece.renderWidth} height={piece.renderHeight}>
          <Defs>
            <ClipPath id={clipId}>
              <Path d={piece.path} />
            </ClipPath>
          </Defs>
          <SvgImage
            href={{ uri: imageUrl }}
            x={piece.padding - piece.targetX}
            y={piece.padding - piece.targetY}
            width={boardWidth}
            height={boardHeight}
            preserveAspectRatio="none"
            clipPath={`url(#${clipId})`}
          />
          <Path
            d={piece.path}
            fill="none"
            stroke={colors.neonCyan}
            strokeWidth={1.5}
          />
        </Svg>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    left: 0,
    top: 0,
    shadowColor: colors.neonCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 7,
  },
});