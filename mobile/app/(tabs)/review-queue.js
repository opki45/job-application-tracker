import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { useGmail } from '../../src/GmailContext';
import { colors, radius } from '../../src/theme';
import CandidateCard from '../../src/components/CandidateCard';

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
      <FlatList
        data={candidates}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={styles.title}>Review queue{candidates.length > 0 ? ` (${candidates.length})` : ''}</Text>
            <Pressable
              style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
              onPress={handleSync}
              disabled={syncing}
            >
              <Text style={styles.syncBtnText}>{syncing ? 'Syncing...' : 'Sync now'}</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <CandidateCard candidate={item} onAccept={handleAccept} onDismiss={handleDismiss} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="mail-open-outline" size={40} color={colors.faint} />
            {gmail.connected ? (
              <>
                <Text style={styles.emptyTitle}>Gmail connected</Text>
                <Text style={styles.emptySub}>Tap Sync now to scan your inbox.</Text>
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  syncBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  syncBtnDisabled: {
    opacity: 0.6,
  },
  syncBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
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
