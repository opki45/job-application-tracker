import { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/api';
import { colors, radius } from '../../../src/theme';
import CompanyLogo from '../../../src/components/CompanyLogo';
import StatusPill from '../../../src/components/StatusPill';
import PickerField from '../../../src/components/PickerField';

const STATUS_OPTIONS = [
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'accepted', label: 'Accepted' },
];

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// created_at/updated_at come back as MySQL TIMESTAMP strings (dateStrings:true
// on the pool -- see server/src/db/pool.js), e.g. "2026-08-10 12:34:56", not
// ISO 8601. `new Date()` on that format isn't reliable across JS engines, so
// this only needs the date part anyway -- slice it off and reuse the same
// parse-from-parts approach as formatDate above.
function formatDateTime(value) {
  return formatDate(value.slice(0, 10));
}

// NEW screen -- matches designs/mobile-view.png's screen 5. There's no
// audit-log table backing "Activity", so it's built from what the row
// itself has: created_at, updated_at, and source -- see mobile/PLAN.md's
// Context section for why a full per-status-change history isn't here.
export default function ApplicationDetail() {
  const { id } = useLocalSearchParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.get(`/applications/${id}`);
      setApp(data.application);
      setNotes(data.application.notes || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleStatusChange(status) {
    try {
      await api.put(`/applications/${id}`, { status });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    try {
      await api.put(`/applications/${id}`, { notes });
      setNotesSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingNotes(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete application', `Remove ${app.company} — ${app.role}? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.del(`/applications/${id}`);
          router.replace('/applications');
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!app) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error || 'Application not found.'}</Text>
      </View>
    );
  }

  const activity = [
    { label: 'Added to Landed', date: app.created_at },
    ...(app.source === 'email' ? [{ label: 'Imported from Gmail', date: app.created_at }] : []),
    ...(app.updated_at !== app.created_at ? [{ label: 'Last updated', date: app.updated_at }] : []),
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Application</Text>
        <Pressable onPress={confirmDelete} hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identityRow}>
          <CompanyLogo company={app.company} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={styles.company}>{app.company}</Text>
            <Text style={styles.role}>{app.role}</Text>
          </View>
        </View>
        <View style={{ marginTop: 8, marginBottom: 20 }}>
          <StatusPill status={app.status} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Date applied</Text>
          <Text style={styles.fieldValue}>{formatDate(app.date_applied)}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Source</Text>
          <View style={styles.sourceValue}>
            {app.source === 'email' && <Ionicons name="mail" size={14} color={colors.primary} />}
            <Text style={styles.fieldValue}>{app.source === 'email' ? 'Gmail import' : 'Manual'}</Text>
          </View>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Status</Text>
          <PickerField value={app.status} options={STATUS_OPTIONS} onChange={handleStatusChange} title="Set status" />
        </View>

        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          multiline
          maxLength={500}
          placeholder="Recruiter name, next steps, interview dates..."
          placeholderTextColor={colors.faint}
          value={notes}
          onChangeText={(t) => { setNotes(t); setNotesSaved(false); }}
        />
        <View style={styles.notesFooter}>
          <Text style={styles.charCount}>{notes.length}/500</Text>
          <Pressable
            style={[styles.saveBtn, savingNotes && styles.saveBtnDisabled]}
            onPress={handleSaveNotes}
            disabled={savingNotes}
          >
            <Text style={styles.saveBtnText}>{savingNotes ? 'Saving...' : notesSaved ? 'Saved' : 'Save notes'}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.activityList}>
          {activity.map((item, i) => (
            <View key={i} style={styles.activityRow}>
              <View style={styles.activityDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activityDate}>{formatDateTime(item.date)}</Text>
                <Text style={styles.activityLabel}>{item.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={styles.deleteText}>Delete application</Text>
        </Pressable>
      </ScrollView>
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
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  company: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
  },
  role: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fieldLabel: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  fieldValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  sourceValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: 22,
    marginBottom: 10,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    minHeight: 90,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
  },
  notesFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  charCount: {
    fontSize: 11,
    color: colors.faint,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  activityList: {
    gap: 14,
  },
  activityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  activityDate: {
    fontSize: 12,
    color: colors.faint,
  },
  activityLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    marginTop: 1,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: radius.sm,
    paddingVertical: 13,
    marginTop: 28,
    backgroundColor: '#fef2f2',
  },
  deleteText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 10,
  },
});
