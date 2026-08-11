import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/AuthContext';
import { useGmail } from '../../src/GmailContext';
import { colors, radius } from '../../src/theme';
import TopBar from '../../src/components/TopBar';
import BottomTabBar from '../../src/components/BottomTabBar';

// NEW screen. The mockup doesn't detail this one (it's just a bottom-tab
// icon in every screenshot), so it's kept intentionally minimal and real:
// account info, Gmail disconnect (the counterpart to Home's connect
// prompt -- disconnecting isn't shown anywhere else once connected), and
// logout. Room to grow into Reminders/Settings-equivalents later, same as
// the web app has, without needing a new nav slot.
export default function More() {
  const { user, logout } = useAuth();
  const gmail = useGmail();

  function confirmDisconnect() {
    Alert.alert('Disconnect Gmail', 'Stop auto-importing job application emails?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: gmail.disconnect },
    ]);
  }

  function confirmLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <TopBar />
      <View style={styles.content}>
        <Text style={styles.title}>More</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.email || '?').charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
          </View>
        </View>

        {gmail.connected && (
          <Pressable style={styles.item} onPress={confirmDisconnect}>
            <Ionicons name="mail-outline" size={18} color={colors.text} />
            <Text style={styles.itemText}>Disconnect Gmail</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.faint} />
          </Pressable>
        )}

        <Pressable style={styles.item} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={[styles.itemText, { color: colors.danger }]}>Log out</Text>
        </Pressable>
      </View>
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  email: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
