import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { colors, radius } from '../../src/theme';
import ApplicationRow from '../../src/components/ApplicationRow';

const FILTERS = ['', 'applied', 'interviewing', 'offer', 'rejected', 'accepted'];

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.get('/applications');
      setApplications(data.applications);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleStatusChange(id, status) {
    try {
      await api.put(`/applications/${id}`, { status });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveNotes(id, notes) {
    await api.put(`/applications/${id}`, { notes });
    await load();
  }

  async function handleDelete(id) {
    try {
      await api.del(`/applications/${id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const visible = statusFilter ? applications.filter((a) => a.status === statusFilter) : applications;

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
        data={visible}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>
              {statusFilter ? `${statusFilter} (${visible.length})` : `All applications (${applications.length})`}
            </Text>
            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <Pressable
                  key={f || 'all'}
                  style={[styles.chip, statusFilter === f && styles.chipActive]}
                  onPress={() => setStatusFilter(f)}
                >
                  <Text style={[styles.chipText, statusFilter === f && styles.chipTextActive]}>
                    {f || 'All'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        }
        renderItem={({ item }) => (
          <ApplicationRow
            app={item}
            onStatusChange={handleStatusChange}
            onSaveNotes={handleSaveNotes}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={40} color={colors.faint} />
            <Text style={styles.emptyTitle}>
              {applications.length === 0 ? 'No applications yet' : `No "${statusFilter}" applications`}
            </Text>
            {applications.length === 0 && (
              <Text style={styles.emptySub}>Add one from the Home tab.</Text>
            )}
          </View>
        }
      />
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
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
    textTransform: 'capitalize',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.brandTint,
    borderColor: '#d9d5fb',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: colors.primary,
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
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 10,
  },
});
