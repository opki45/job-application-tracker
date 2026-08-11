import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { useGmail } from '../../src/GmailContext';
import { colors } from '../../src/theme';
import CandidateCard from '../../src/components/CandidateCard';

// Matches designs/mobile-view.png's screen 4: back arrow, "Review queue N",
// "Sync now" -- and deliberately no BottomTabBar, since this screen isn't
// one of the 5 tab destinations (it's reached from Home's review-queue
// section, see (app)/index.js).
export default function ReviewQueue() {
  const gmail = useGmail();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.get('/candidates');
      setCandidates(data.candidates);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      gmail.refresh();
    }, [load])
  );

  async function handleSync() {
    setSyncing(true);
    setError('');
    try {
      await api.post('/sync/gmail');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleAccept(id, overrides) {
    await api.post(`/candidates/${id}/accept`, overrides);
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleDismiss(id) {
    await api.post(`/candidates/${id}/dismiss`);
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          Review queue{candidates.length > 0 ? ` ${candidates.length}` : ''}
        </Text>
        <Pressable onPress={handleSync} disabled={syncing} hitSlop={10}>
          <Text style={styles.syncLink}>{syncing ? 'Syncing...' : 'Sync now'}</Text>
        </Pressable>
      </View>

      <FlatList
        data={candidates}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <CandidateCard candidate={item} onAccept={handleAccept} onDismiss={handleDismiss} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="mail-open-outline" size={40} color={colors.faint} />
            {gmail.connected ? (
              <>
                <Text style={styles.emptyTitle}>Gmail connected</Text>
                <Text style={styles.emptySub}>
                  Press Sync now to scan your inbox for job application emails.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>No candidates waiting for review</Text>
                <Text style={styles.emptySub}>Connect Gmail from the Home tab first.</Text>
              </>
            )}
          </View>
        }
      />
      {error ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  syncLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
  errorBar: {
    padding: 12,
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
});
