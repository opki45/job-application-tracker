import { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { colors, radius } from '../../src/theme';
import ApplicationRow from '../../src/components/ApplicationRow';
import TopBar from '../../src/components/TopBar';
import BottomTabBar from '../../src/components/BottomTabBar';
import PickerField from '../../src/components/PickerField';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'accepted', label: 'Accepted' },
];

// The full applications list, matching designs/mobile-view.png's screen 3:
// a status filter, a result count, a sort toggle, and summary rows that tap
// through to the detail screen (application/[id].js) -- no inline
// edit/delete here anymore, that all moved to the detail screen.
export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortDir, setSortDir] = useState('desc'); // by date_applied
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

  const visible = useMemo(() => {
    const filtered = statusFilter ? applications.filter((a) => a.status === statusFilter) : applications;
    const sorted = [...filtered].sort((a, b) =>
      sortDir === 'desc'
        ? b.date_applied.localeCompare(a.date_applied)
        : a.date_applied.localeCompare(b.date_applied)
    );
    return sorted;
  }, [applications, statusFilter, sortDir]);

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
      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Your applications</Text>
            <View style={styles.filterRow}>
              <PickerField
                value={statusFilter}
                options={STATUS_OPTIONS}
                onChange={setStatusFilter}
                title="Filter by status"
              />
              <Text style={styles.results}>{visible.length} results</Text>
              <Pressable
                style={styles.sortBtn}
                onPress={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
              >
                <Ionicons name="swap-vertical" size={16} color={colors.muted} />
              </Pressable>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        }
        renderItem={({ item }) => <ApplicationRow app={item} />}
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  results: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
  },
  sortBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
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
