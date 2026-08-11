import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { colors, radius } from '../../src/theme';
import TopBar from '../../src/components/TopBar';
import BottomTabBar from '../../src/components/BottomTabBar';
import CompanyLogo from '../../src/components/CompanyLogo';
import StatusPill from '../../src/components/StatusPill';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// NEW screen. Mirrors client/src/pages/CalendarPage.jsx's logic exactly --
// same dateKey() construction (plain integer parts, not a UTC-shifting
// Date.toISOString()), same month-grid math -- just RN views instead of
// DOM. No new backend: derived entirely from GET /api/applications.
function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarScreen() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);

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

  const byDate = useMemo(() => {
    const map = {};
    for (const app of applications) {
      (map[app.date_applied] ||= []).push(app);
    }
    return map;
  }, [applications]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const selectedApps = selectedDate ? byDate[selectedDate] || [] : [];

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
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <View style={styles.monthHeader}>
            <Pressable onPress={() => setViewDate(new Date(year, month - 1, 1))} hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable onPress={() => setViewDate(new Date(year, month + 1, 1))} hitSlop={8}>
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label, i) => (
              <Text key={i} style={styles.weekdayLabel}>{label}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={i} style={styles.cell} />;
              const key = dateKey(year, month, day);
              const dayApps = byDate[key] || [];
              const isSelected = key === selectedDate;
              const isToday = key === todayKey;
              return (
                <Pressable
                  key={i}
                  style={[styles.cell, styles.cellFilled, isSelected && styles.cellSelected, isToday && styles.cellToday]}
                  onPress={() => setSelectedDate(isSelected ? null : key)}
                >
                  <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>{day}</Text>
                  {dayApps.length > 0 && (
                    <View style={styles.dots}>
                      {dayApps.slice(0, 3).map((a) => (
                        <View key={a.id} style={[styles.dot, { backgroundColor: colors.status[a.status] }]} />
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {selectedDate && (
          <View style={styles.card}>
            <Text style={styles.dayTitle}>
              {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            {selectedApps.length === 0 ? (
              <Text style={styles.emptyText}>No applications on this day.</Text>
            ) : (
              selectedApps.map((a) => (
                <View key={a.id} style={styles.dayRow}>
                  <CompanyLogo company={a.company} size={32} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dayRowCompany}>{a.company}</Text>
                    <Text style={styles.dayRowRole}>{a.role}</Text>
                  </View>
                  <StatusPill status={a.status} size="sm" />
                </View>
              ))
            )}
          </View>
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
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.faint,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    borderRadius: radius.sm,
  },
  cellSelected: {
    backgroundColor: colors.brandTint,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayNum: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  dayNumSelected: {
    color: colors.primary,
    fontWeight: '800',
  },
  dots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dayRowCompany: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  dayRowRole: {
    fontSize: 12,
    color: colors.muted,
  },
});
