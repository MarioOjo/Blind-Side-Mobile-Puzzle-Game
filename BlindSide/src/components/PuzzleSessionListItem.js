import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import typography from '../theme/typography';

const STATUS_LABELS = {
  'in-progress': 'In progress together',
  completed: 'Completed together',
  invited: 'Invitation ready',
};

export default function PuzzleSessionListItem({ partnerName, status, piecesRemaining, lastPlayed }) {
  const statusLabel = STATUS_LABELS[status] ?? STATUS_LABELS['in-progress'];
  const progressLabel = status === 'completed'
    ? 'Complete'
    : `${piecesRemaining} ${piecesRemaining === 1 ? 'piece' : 'pieces'} left`;

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{partnerName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.partnerName}>{partnerName}</Text>
        <Text style={styles.status}>{statusLabel}</Text>
      </View>
      <View style={styles.progressInfo}>
        <Text style={styles.progress}>{progressLabel}</Text>
        <Text style={styles.lastPlayed}>{lastPlayed}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.electricBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 16,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  partnerName: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 15,
  },
  status: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: typography.body,
    fontSize: 12,
  },
  progressInfo: {
    alignItems: 'flex-end',
    gap: 2,
  },
  progress: {
    color: colors.neonCyan,
    fontFamily: typography.subheading,
    fontSize: 13,
    textAlign: 'right',
  },
  lastPlayed: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: typography.body,
    fontSize: 11,
  },
});