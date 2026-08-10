import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import StatusPicker from './StatusPicker';
import { colors, radius } from '../theme';

// Mirrors client/src/components/ReviewQueue.jsx's CandidateCard: a
// matched_application_id set means this is a status-update proposal
// (company/role read-only, only status/accept matter); null means a
// new-application proposal, editable so a low-confidence extraction (e.g.
// a blank role) can be fixed before accepting -- edit-then-approve, same
// idea as the web app, just plain editable text instead of borderless
// inputs (no CSS "looks like text until focused" trick to reach for here).
export default function CandidateCard({ candidate, onAccept, onDismiss }) {
  const isStatusUpdate = candidate.matched_application_id != null;
  const [company, setCompany] = useState(candidate.company || '');
  const [role, setRole] = useState(candidate.role || '');
  const [status, setStatus] = useState(candidate.status || 'applied');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleAccept() {
    setError('');
    setBusy(true);
    try {
      await onAccept(candidate.id, isStatusUpdate ? { status } : { company, role, status });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleDismiss() {
    setBusy(true);
    try {
      await onDismiss(candidate.id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, isStatusUpdate ? styles.cardUpdate : styles.cardNew]}>
      <Text style={[styles.tag, isStatusUpdate ? styles.tagUpdate : styles.tagNew]}>
        {isStatusUpdate ? 'STATUS UPDATE' : 'NEW APPLICATION (AI DETECTED)'}
      </Text>

      {isStatusUpdate ? (
        <View style={styles.readOnlyInfo}>
          <Text style={styles.company}>{candidate.company}</Text>
          <Text style={styles.role}>{candidate.role}</Text>
        </View>
      ) : (
        <View style={styles.fields}>
          <TextInput style={styles.input} placeholder="Company" value={company} onChangeText={setCompany} />
          <TextInput style={styles.input} placeholder="Role" value={role} onChangeText={setRole} />
        </View>
      )}

      <View style={styles.metaRow}>
        <StatusPicker status={status} onChange={setStatus} />
        <Text style={styles.confidence}>{Math.round(candidate.confidence * 100)}% confidence</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={[styles.btn, styles.btnAccept]} onPress={handleAccept} disabled={busy}>
          <Text style={styles.btnAcceptText}>Accept</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnDismiss]} onPress={handleDismiss} disabled={busy}>
          <Text style={styles.btnDismissText}>Dismiss</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
  },
  cardNew: {
    backgroundColor: '#fbfaff',
    borderColor: '#e5e0fb',
  },
  cardUpdate: {
    backgroundColor: '#fffcf5',
    borderColor: '#fbe7c2',
  },
  tag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  tagNew: {
    backgroundColor: '#ece7fd',
    color: colors.primary,
  },
  tagUpdate: {
    backgroundColor: '#fdecc8',
    color: '#92650a',
  },
  readOnlyInfo: {
    marginBottom: 10,
  },
  fields: {
    gap: 6,
    marginBottom: 10,
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    fontSize: 14,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  confidence: {
    fontSize: 12,
    color: colors.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnAccept: {
    backgroundColor: '#16a34a',
  },
  btnAcceptText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  btnDismiss: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnDismissText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginBottom: 8,
  },
});
