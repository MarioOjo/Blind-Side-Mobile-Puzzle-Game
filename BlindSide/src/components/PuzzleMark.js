import Svg, { Path } from 'react-native-svg';
import colors from '../theme/colors';

// Static assembled puzzle-piece mark; the splash screen animates the same shapes into this final state.
export default function PuzzleMark({ size = 32 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* The four cyan pieces form the BlindSide puzzle mark. */}
      <Path d="M70 30 L 70 70 L 30 70 L 30 30 Z" fill={colors.neonCyan} />
      <Path d="M40 30 C 40 20, 60 20, 60 30 L 60 35 L 40 35 Z" fill={colors.neonCyan} />
      <Path d="M40 70 C 40 80, 60 80, 60 70 L 60 65 L 40 65 Z" fill={colors.neonCyan} />
      <Path d="M30 40 L 35 40 C 45 40, 45 60, 35 60 L 30 60 Z" fill={colors.neonCyan} />
      {/* The navy notch cuts through the mark to suggest a missing puzzle piece. */}
      <Path d="M70 40 L 65 40 C 55 40, 55 60, 65 60 L 70 60 L 70 40 Z" fill={colors.midnightNavy} />
    </Svg>
  );
}
