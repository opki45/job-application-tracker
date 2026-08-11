import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CompanyLogo from './CompanyLogo';
import StatusPill from './StatusPill';
import { colors } from '../theme';

// date_applied is a "YYYY-MM-DD" string. Built from parts, not
// `new Date(dateString)`, for the same reason as the web app's formatDate
// util: the latter parses as UTC midnight and can render as the previous
// day depending on the device's timezone.
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Summary-only row -- matches designs/mobile-view.png's applications list,
// which shows no inline edit affordances at all. Status changes, notes, and
// delete all moved to the detail screen (application/[id].js); tapping
// anywhere on the row pushes there.
export default function ApplicationRow({ app }) {
  return (
    <Pressable style={styles.row} onPress={() => router.push(`/application/${app.id}`)}>
      <CompanyLogo company={app.company} />
      <View style={styles.info}>
        <Text style={styles.company} numberOfLines={1}>{app.company}</Text>
        <Text style={styles.role} numberOfLines={1}>{app.role}</Text>
      </View>
      <View style={styles.right}>
        <StatusPill status={app.status} />
        <View style={styles.metaRow}>
          {app.source === 'email' ? (
            <Ionicons name="mail" size={12} color={colors.primary} />
          ) : (
            <Text style={styles.sourceText}>Manual</Text>
          )}
        </View>
        <Text style={styles.date}>{formatDate(app.date_applied)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
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
  right: {
    alignItems: 'flex-end',
    gap: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceText: {
    fontSize: 11,
    color: colors.faint,
  },
  date: {
    fontSize: 11,
    color: colors.faint,
  },
});
