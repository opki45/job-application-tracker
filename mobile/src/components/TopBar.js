import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGmail } from '../GmailContext';
import { colors, radius } from '../theme';

// Shared header for every authenticated screen: hamburger (-> Analytics,
// the one destination that doesn't have its own bottom-tab slot -- see
// mobile/PLAN.md), the "Landed" wordmark, and a Gmail status pill. The pill
// is read-only once connected (matches the design, which never shows a
// separate "connect" card once Gmail is linked); tapping it while
// disconnected starts the connect flow directly, one tap instead of two.
export default function TopBar() {
  const gmail = useGmail();

  return (
    <View style={styles.bar}>
      <Pressable hitSlop={10} onPress={() => router.push('/analytics')}>
        <Ionicons name="menu-outline" size={24} color={colors.text} />
      </Pressable>

      <View style={styles.brand}>
        <View style={styles.logoMark}>
          <Ionicons name="trending-up" size={14} color="#fff" />
        </View>
        <Text style={styles.brandText}>Landed</Text>
      </View>

      <Pressable
        style={[styles.gmailPill, gmail.connected ? styles.gmailPillOn : styles.gmailPillOff]}
        onPress={gmail.connected ? undefined : gmail.connect}
        disabled={gmail.loading}
      >
        <View style={[styles.dot, { backgroundColor: gmail.connected ? colors.success : colors.faint }]} />
        <Text style={styles.gmailText}>{gmail.connected ? 'Gmail connected' : 'Connect Gmail'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoMark: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  gmailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  gmailPillOn: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  gmailPillOff: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gmailText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
});
