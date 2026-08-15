// Presents one accessible menu choice with an icon or puzzle thumbnail and trailing navigation cue.
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import typography from '../theme/typography';

export default function PuzzleSelectionRow({
  label,
  supportingText,
  icon = 'extension-puzzle-outline',
  imageUrl,
  onPress,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={supportingText ? `${label}, ${supportingText}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.leading}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <Ionicons name={icon} size={24} color={colors.neonCyan} />
        )}
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.label}>{label}</Text>
        {supportingText ? (
          <Text numberOfLines={1} style={styles.supportingText}>{supportingText}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.neonCyan} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.electricBlue,
    borderRadius: 8,
  },
  rowPressed: {
    opacity: 0.72,
    backgroundColor: 'rgba(37,99,235,0.16)',
  },
  leading: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(6,182,212,0.1)',
    borderRadius: 6,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 15,
  },
  supportingText: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.62)',
    fontFamily: typography.body,
    fontSize: 12,
  },
});