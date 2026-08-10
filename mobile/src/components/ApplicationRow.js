import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusPicker from './StatusPicker';
import { colors, radius } from '../theme';

// date_applied is a "YYYY-MM-DD" string. Built from parts, not
// `new Date(dateString)`, for the same reason as the web app's formatDate
// util: the latter parses as UTC midnight and can render as the previous
// day depending on the device's timezone.
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ApplicationRow({ app, onStatusChange, onSaveNotes, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(app.notes || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSaveNotes(app.id, notes);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete application', `Remove ${app.company} — ${app.role}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(app.id) },
    ]);
  }

  return (
    <View style={[styles.row, { borderLeftColor: colors.status[app.status] }]}>
      <View style={styles.mainRow}>
        <View style={styles.info}>
          <Text style={styles.company}>{app.company}</Text>
          <Text style={styles.role}>{app.role}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.date}>{formatDate(app.date_applied)}</Text>
            {app.source === 'email' && (
              <View style={styles.sourceTag}>
                <Ionicons name="mail-outline" size={11} color={colors.muted} />
                <Text style={styles.sourceText}>Gmail</Text>
              </View>
            )}
          </View>
        </View>

        <StatusPicker status={app.status} onChange={(s) => onStatusChange(app.id, s)} />
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionBtn} onPress={() => setExpanded((v) => !v)}>
          <Ionicons
            name={app.notes ? 'document-text' : 'document-text-outline'}
            size={16}
            color={app.notes ? colors.primary : colors.muted}
          />
          <Text style={styles.actionText}>Notes</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
        </Pressable>
      </View>

      {expanded && (
        <View style={styles.notesBox}>
          <TextInput
            style={styles.notesInput}
            multiline
            placeholder="Recruiter name, next steps, interview dates..."
            placeholderTextColor={colors.faint}
            value={notes}
            onChangeText={setNotes}
          />
          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save notes'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  company: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  role: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  date: {
    fontSize: 12,
    color: colors.faint,
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sourceText: {
    fontSize: 11,
    color: colors.muted,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  notesBox: {
    marginTop: 10,
    gap: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    minHeight: 70,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 9,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
