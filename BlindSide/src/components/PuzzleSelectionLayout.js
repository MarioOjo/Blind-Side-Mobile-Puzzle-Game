// Provides the shared loading, error, empty, and responsive list shell for solo selection screens.
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import colors from '../theme/colors';
import typography from '../theme/typography';

export default function PuzzleSelectionLayout({
  title,
  subtitle,
  isLoading,
  error,
  isEmpty,
  emptyMessage,
  isLandscape,
  children,
}) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isLandscape && styles.landscapeContent]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heading}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {isLoading ? (
        <View style={styles.state}>
          <ActivityIndicator size="large" color={colors.neonCyan} />
          <Text style={styles.stateText}>Loading puzzles...</Text>
        </View>
      ) : null}
      {!isLoading && error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!isLoading && !error && isEmpty ? (
        <Text style={styles.stateText}>{emptyMessage}</Text>
      ) : null}
      {!isLoading && !error && !isEmpty ? <View style={styles.list}>{children}</View> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnightNavy,
  },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 36,
  },
  landscapeContent: {
    maxWidth: 760,
    paddingVertical: 16,
  },
  heading: {
    marginBottom: 18,
  },
  title: {
    color: colors.white,
    fontFamily: typography.heading,
    fontSize: 24,
  },
  subtitle: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.62)',
    fontFamily: typography.body,
    fontSize: 13,
  },
  list: {
    gap: 10,
  },
  state: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stateText: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    color: '#FCA5A5',
    fontFamily: typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
});