import { ScrollView, View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Card from './Card';
import PuzzleMark from './PuzzleMark';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';

// Shared shell for Login and Register so the two auth screens stay visually identical:
// brand badge, wordmark, tagline, a centered card, and the footer tagline.
export default function AuthLayout({ children }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isLandscape && styles.landscapeContent]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* The brand badge anchors the top of the auth screen. */}
      <View style={[styles.logoBadge, isLandscape && styles.landscapeLogoBadge, shadows.glowCyan]}>
        <PuzzleMark size={isLandscape ? 24 : 32} />
      </View>
      {/* Wordmark and tagline keep the auth screens aligned with the splash branding. */}
      <Text style={styles.logo}>
        BLIND<Text style={styles.logoAccent}>SIDE</Text>
      </Text>
      <Text style={styles.tagline}>Race. Reveal. Challenge.</Text>
      <Card style={styles.card}>{children}</Card>
      <Text style={styles.footerTagline}>Challenge your mind. Beat the clock.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnightNavy,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  landscapeContent: {
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.midnightNavy,
    borderWidth: 1.5,
    borderColor: colors.neonCyan,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  landscapeLogoBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 0,
  },
  logo: {
    color: colors.white,
    fontFamily: typography.logo,
    fontSize: 26,
  },
  logoAccent: {
    color: colors.neonCyan,
  },
  tagline: {
    color: colors.white,
    fontFamily: typography.body,
    fontSize: 14,
    marginBottom: 12,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    gap: 12,
  },
  footerTagline: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
