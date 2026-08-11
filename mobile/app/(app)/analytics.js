import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { colors, radius } from '../../src/theme';
import { bucketOverTime } from '../../src/utils/dateBuckets';
import TopBar from '../../src/components/TopBar';
import BottomTabBar from '../../src/components/BottomTabBar';
import PickerField from '../../src/components/PickerField';
import DonutChart from '../../src/components/DonutChart';
import LineChart from '../../src/components/LineChart';

const STATUSES = ['applied', 'interviewing', 'offer', 'rejected', 'accepted'];
const CHART_WIDTH = Dimensions.get('window').width - 64;

const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];
const GRANULARITY_OPTIONS = [
  { value: 'week', label: 'By week' },
  { value: 'month', label: 'By month' },
];

// NEW screen. Reached via TopBar's hamburger, not a bottom tab (see
// mobile/PLAN.md's Context section for why). Everything here is derived
// client-side from GET /api/applications, same as the web app's own
// AnalyticsPage.jsx -- just presented as the donut/line charts the design
// shows instead of the web page's funnel/bar treatment. Status colors reuse
// the one validated palette (colors.status) used everywhere else.
export default function Analytics() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState('30');
  const [granularity, setGranularity] = useState('week');

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

  const filtered = useMemo(() => {
    if (range === 'all') return applications;
    const days = Number(range);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    return applications.filter((a) => a.date_applied >= cutoffKey);
  }, [applications, range]);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const a of filtered) counts[a.status] = (counts[a.status] || 0) + 1;
    return counts;
  }, [filtered]);

  const buckets = useMemo(
    () => bucketOverTime(filtered, granularity, granularity === 'month' ? 6 : 8),
    [filtered, granularity]
  );

  const sourceCounts = useMemo(() => {
    let gmail = 0;
    let manual = 0;
    for (const a of filtered) {
      if (a.source === 'email') gmail += 1;
      else manual += 1;
    }
    return { gmail, manual };
  }, [filtered]);

  const total = filtered.length || 1;
  const donutSegments = STATUSES.map((s) => ({ status: s, count: statusCounts[s], color: colors.status[s] }));

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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Overview</Text>
          <PickerField value={range} options={RANGE_OPTIONS} onChange={setRange} title="Time range" />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{filtered.length}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Applied</Text>
            <Text style={[styles.statValue, { color: colors.status.applied }]}>{statusCounts.applied}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Interviewing</Text>
            <Text style={[styles.statValue, { color: colors.status.interviewing }]}>{statusCounts.interviewing}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Offers</Text>
            <Text style={[styles.statValue, { color: colors.status.offer }]}>{statusCounts.offer}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Applications over time</Text>
            <PickerField value={granularity} options={GRANULARITY_OPTIONS} onChange={setGranularity} />
          </View>
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>Not enough data yet.</Text>
          ) : (
            <LineChart buckets={buckets} width={CHART_WIDTH} />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Applications by status</Text>
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>Add some applications to see this.</Text>
          ) : (
            <View style={styles.donutRow}>
              <DonutChart segments={donutSegments} />
              <View style={styles.legend}>
                {STATUSES.map((s) => (
                  <View key={s} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: colors.status[s] }]} />
                    <Text style={styles.legendLabel}>{s}</Text>
                    <Text style={styles.legendValue}>
                      {statusCounts[s]} ({Math.round((statusCounts[s] / total) * 100)}%)
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Source breakdown</Text>
          <Text style={styles.cardSub}>Based on {filtered.length} applications</Text>
          <View style={styles.sourceRow}>
            <View style={styles.sourceLabelRow}>
              <Ionicons name="mail" size={13} color={colors.primary} />
              <Text style={styles.sourceLabel}>Gmail import</Text>
            </View>
            <Text style={styles.sourceValue}>
              {sourceCounts.gmail} ({Math.round((sourceCounts.gmail / total) * 100)}%)
            </Text>
          </View>
          <View style={styles.sourceRow}>
            <View style={styles.sourceLabelRow}>
              <Ionicons name="create-outline" size={13} color={colors.faint} />
              <Text style={styles.sourceLabel}>Manual</Text>
            </View>
            <Text style={styles.sourceValue}>
              {sourceCounts.manual} ({Math.round((sourceCounts.manual / total) * 100)}%)
            </Text>
          </View>
          <View style={styles.stackedBar}>
            <View style={{ flex: sourceCounts.gmail || 0.0001, backgroundColor: colors.primary }} />
            <View style={{ flex: sourceCounts.manual || 0.0001, backgroundColor: colors.faint }} />
          </View>
        </View>
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
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCell: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  cardSub: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    paddingVertical: 12,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  legend: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    textTransform: 'capitalize',
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sourceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  sourceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  stackedBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
});
