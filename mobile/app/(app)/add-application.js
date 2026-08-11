import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { colors, radius } from '../../src/theme';
import PickerField from '../../src/components/PickerField';

const STATUS_OPTIONS = [
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'accepted', label: 'Accepted' },
];

// NEW screen, opened as a modal by BottomTabBar's center `+` button. Same
// create-application call Home's inline form uses (POST /applications,
// date_applied defaults to today server-side if omitted) -- this is just a
// second, faster entry point to the same action, matching the design's
// dedicated `+` tab.
export default function AddApplication() {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('applied');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      await api.post('/applications', { company, role, status });
      router.back();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add application</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.fieldLabel}>Company name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Datadog"
          placeholderTextColor={colors.faint}
          value={company}
          onChangeText={setCompany}
          autoFocus
        />
        <Text style={styles.fieldLabel}>Role</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Software Engineer"
          placeholderTextColor={colors.faint}
          value={role}
          onChangeText={setRole}
        />
        <Text style={styles.fieldLabel}>Status</Text>
        <PickerField value={status} options={STATUS_OPTIONS} onChange={setStatus} title="Set status" />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, (submitting || !company || !role) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !company || !role}
        >
          <Text style={styles.buttonText}>{submitting ? 'Adding...' : 'Add application'}</Text>
          {!submitting && <Ionicons name="add" size={16} color="#fff" />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  content: {
    paddingHorizontal: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 13,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  button: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 12,
  },
});
