// Starts cooperative selection by picking the deepest relationship tier questions may reach,
// while preserving partner context. Questions start light and escalate toward it.
import { useWindowDimensions } from 'react-native';
import PuzzleSelectionLayout from '../components/PuzzleSelectionLayout';
import PuzzleSelectionRow from '../components/PuzzleSelectionRow';
import {
  COOPERATIVE_TIER_OPTIONS,
  createCooperativeContext,
} from '../utils/cooperativeCatalog';

export default function CooperativeTierSelectionScreen({ navigation, route }) {
  const { width, height } = useWindowDimensions();
  const partnerId = route.params?.partnerId;
  const partnerName = route.params?.partnerName;
  const hasPartner = typeof partnerId === 'string' && partnerId.length > 0;

  return (
    <PuzzleSelectionLayout
      title="How deep should questions go?"
      subtitle={hasPartner
        ? `Playing with ${partnerName ?? 'Puzzle Partner'} — questions start light and build up to the tier you pick.`
        : ''}
      isLoading={false}
      error={hasPartner ? '' : 'Choose a puzzle partner before selecting a tier.'}
      isEmpty={false}
      emptyMessage=""
      isLandscape={width > height}
    >
      {COOPERATIVE_TIER_OPTIONS.map((option) => (
        <PuzzleSelectionRow
          key={option.key}
          label={option.label}
          icon={option.icon}
          onPress={() => navigation.push('CooperativeCategorySelection', createCooperativeContext({
            partnerId,
            partnerName,
            tier: option.key,
          }))}
        />
      ))}
    </PuzzleSelectionLayout>
  );
}