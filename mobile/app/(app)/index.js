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
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { useGmail } from '../../src/GmailContext';
import { colors, radius } from '../../src/theme';
import { bucketByWeek } from '../../src/utils/dateBuckets';
import StatCard from '../../src/components/StatCard';
import TopBar from '../../src/components/TopBar';
import BottomTabBar from '../../src/components/BottomTabBar';
import CandidateCard from '../../src/components/CandidateCard';

// Home/Dashboard, matching designs/mobile-view.png's screen 2: stats with
// real sparklines, a quick-add form, and an inline review-queue preview
// (same CandidateCard the dedicated /review-queue screen uses -- tapping
// the section header pushes there for the full list). The Gmail card only
// renders pre-connection; once connected there's nothing to show here
// beyond the TopBar's status pill, matching every connected-state
// screenshot in the design.
export default function Home() {
  const gmail = useGmail();

  const [applications, setApplications] = useState([]);
  const [candidates, setCandidates] = useState([]);
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
      const [appsData, candidatesData] = await Promise.all([
        api.get('/applications'),
        api.get('/candidates'),
      ]);
      setApplications(appsData.applications);
      setCandidates(candidatesData.candidates);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  async function handleAccept(id, overrides) {
    await api.post(`/candidates/${id}/accept`, overrides);
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    load();
  }

  async function handleDismiss(id) {
    await api.post(`/candidates/${id}/dismiss`);
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  const counts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const byStatus = (status) => applications.filter((a) => a.status === status);
  const offerLike = applications.filter((a) => a.status === 'offer' || a.status === 'accepted');

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopBar />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View style={styles.statsGrid}>
          <StatCard label="Total" value={applications.length} color={colors.primary} trend={bucketByWeek(applications)} />
          <StatCard label="Applied" value={counts.applied || 0} color={colors.status.applied} trend={bucketByWeek(byStatus('applied'))} />
          <StatCard label="Interviewing" value={counts.interviewing || 0} color={colors.status.interviewing} trend={bucketByWeek(byStatus('interviewing'))} />
          <StatCard label="Offers" value={(counts.offer || 0) + (counts.accepted || 0)} color={colors.status.offer} trend={bucketByWeek(offerLike)} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!gmail.loading && !gmail.connected && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connect Gmail</Text>
            <Text style={styles.cardSub}>
              Automatically detect job application emails and add them to your review queue.
            </Text>
            <Pressable style={[styles.button, styles.buttonPrimary]} onPress={gmail.connect}>
              <Text style={styles.buttonText}>Connect Gmail</Text>
            </Pressable>
            <Text style={styles.hint}>Opens in your browser -- come back here once you're done.</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add an application</Text>
          <Text style={styles.cardSub}>Manually add a job to keep your search organized.</Text>
          <Text style={styles.fieldLabel}>Company name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Datadog"
            placeholderTextColor={colors.faint}
            value={company}
            onChangeText={setCompany}
          />
          <Text style={styles.fieldLabel}>Role</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Software Engineer"
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
            {!creating && <Ionicons name="add" size={16} color="#fff" />}
          </Pressable>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Pressable onPress={() => router.push('/review-queue')} style={styles.sectionHeaderLink}>
            <Text style={styles.sectionTitle}>
              Review queue{candidates.length > 0 ? ` ${candidates.length}` : ''}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
          {gmail.connected && (
            <Pressable onPress={handleSync} disabled={syncing}>
              <Text style={styles.syncLink}>{syncing ? 'Syncing...' : 'Sync Gmail now'}</Text>
            </Pressable>
          )}
        </View>
        {syncMessage ? <Text style={styles.cardSub}>{syncMessage}</Text> : null}

        {candidates.length === 0 ? (
          <View style={styles.emptyQueue}>
            <Text style={styles.cardSub}>
              {gmail.connected
                ? 'Gmail connected. Press Sync now to scan your inbox for job application emails.'
                : 'Connect Gmail to automatically detect job application emails.'}
            </Text>
          </View>
        ) : (
          candidates
            .slice(0, 3)
            .map((c) => (
              <CandidateCard key={c.id} candidate={c} onAccept={handleAccept} onDismiss={handleDismiss} />
            ))
        )}
      </ScrollView>
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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
    marginBottom: 4,
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
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    gap: 6,
    borderRadius: radius.sm,
    padding: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeaderLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  syncLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyQueue: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 16,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 10,
  },
});
