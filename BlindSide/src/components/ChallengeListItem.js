import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import typography from '../theme/typography';

const STATUS_STYLES = {
  won: { label: 'Won', color: colors.victoryGold },
  lost: { label: 'Lost', color: '#F87171' },
  pending: { label: 'Pending', color: colors.neonCyan },
};

export default function ChallengeListItem({ opponent, status, time, timestamp }) {
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.pending;

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{opponent.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.opponent}>{opponent}</Text>
        <Text style={[styles.status, { color: statusStyle.color }]}>{statusStyle.label}</Text>
      </View>
      <View style={styles.timeInfo}>
        <Text style={[styles.time, { color: statusStyle.color }]}>{time}</Text>
        {timestamp ? <Text style={styles.timestamp}>{timestamp}</Text> : null}
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
  opponent: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 15,
  },
  status: {
    fontFamily: typography.body,
    fontSize: 12,
  },
  time: {
    fontFamily: typography.subheading,
    fontSize: 13,
    textAlign: 'right',
  },
  timeInfo: {
    alignItems: 'flex-end',
    gap: 2,
  },
  timestamp: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: typography.body,
    fontSize: 11,
  },
});
