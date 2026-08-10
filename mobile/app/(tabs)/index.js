import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { useAuth } from '../../src/AuthContext';
import { useGmail } from '../../src/GmailContext';
import { colors, radius } from '../../src/theme';
import StatCard from '../../src/components/StatCard';

// The Home tab: the same "at a glance" role the web Dashboard plays --
// stats, Gmail connection, and the quick-add form. Full list management
// (status changes, notes, delete, filtering) lives on the Applications tab.
export default function Home() {
  const { user, logout } = useAuth();
  const gmail = useGmail();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.get('/applications');
      setApplications(data.applications);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch every time this tab regains focus -- covers coming back from
  // the Applications tab after an edit, and from the browser after a Gmail
  // connect attempt (see the note in GmailContext.js).
  useFocusEffect(
    useCallback(() => {
      load();
      gmail.refresh();
    }, [load])
  );

  async function handleCreate() {
    setFormError('');
    setCreating(true);
    try {
      await api.post('/applications', { company, role });
      setCompany('');
      setRole('');
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleSync() {
    setSyncMessage('');
    setSyncing(true);
    try {
      const result = await api.post('/sync/gmail');
      setSyncMessage(`Scanned ${result.scanned}, found ${result.candidates} new candidate(s).`);
      await load();
    } catch (err) {
      setSyncMessage(err.message);
    } finally {
      setSyncing(false);
    }
  }

  const counts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Landed</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color={colors.muted} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Total" value={applications.length} color={colors.primary} />
        <StatCard label="Applied" value={counts.applied || 0} color={colors.status.applied} />
        <StatCard label="Interviewing" value={counts.interviewing || 0} color={colors.status.interviewing} />
        <StatCard
          label="Offers"
          value={(counts.offer || 0) + (counts.accepted || 0)}
          color={colors.status.offer}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gmail</Text>
        {gmail.loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
        ) : gmail.connected ? (
          <>
            <Text style={styles.cardSub}>Gmail connected ✓</Text>
            <View style={styles.gmailActions}>
              <Pressable
                style={[styles.button, styles.buttonPrimary, syncing && styles.buttonDisabled]}
                onPress={handleSync}
                disabled={syncing}
              >
                <Text style={styles.buttonText}>{syncing ? 'Syncing...' : 'Sync Gmail now'}</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.buttonGhost]} onPress={gmail.disconnect}>
                <Text style={styles.buttonGhostText}>Disconnect</Text>
              </Pressable>
            </View>
            {syncMessage ? <Text style={styles.cardSub}>{syncMessage}</Text> : null}
          </>
        ) : (
          <>
            <Text style={styles.cardSub}>
              Connect Gmail to automatically detect job application emails.
            </Text>
            <Pressable style={[styles.button, styles.buttonGhost]} onPress={gmail.connect}>
              <Text style={styles.buttonGhostText}>Connect Gmail</Text>
            </Pressable>
            <Text style={styles.hint}>Opens in your browser -- come back here once you're done.</Text>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add an application</Text>
        <TextInput
          style={styles.input}
          placeholder="Company (e.g. Monzo)"
          placeholderTextColor={colors.faint}
          value={company}
          onChangeText={setCompany}
        />
        <TextInput
          style={styles.input}
          placeholder="Role (e.g. Graduate Engineer)"
          placeholderTextColor={colors.faint}
          value={role}
          onChangeText={setRole}
        />
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <Pressable
          style={[styles.button, styles.buttonPrimary, (creating || !company || !role) && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={creating || !company || !role}
        >
          <Text style={styles.buttonText}>{creating ? 'Adding...' : 'Add application'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  email: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logoutText: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  cardSub: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 10,
  },
  hint: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 8,
  },
  gmailActions: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 10,
  },
  button: {
    borderRadius: radius.sm,
    padding: 12,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    flex: 1,
  },
  buttonGhost: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonGhostText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 10,
  },
});
