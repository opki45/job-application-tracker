import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

// Mirrors the web dashboard's stat cards (client/src/pages/Dashboard.jsx) --
// same 4 numbers, same accent color per card. No sparkline here; it was
// decorative on the web too (no real time-series behind it), and a native
// SVG chart isn't worth the extra dependency for a v1 mobile app.
export default function StatCard({ label, value, color }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.label, { color }]}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    minWidth: '47%',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
});
