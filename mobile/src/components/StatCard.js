import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';
import Sparkline from './Sparkline';

// Mirrors the web dashboard's stat cards (client/src/pages/Dashboard.jsx),
// plus a real sparkline: the caller passes that status's applications
// bucketed by week of date_applied (see (app)/index.js), so each card's
// trend line is genuinely derived, not decorative filler.
export default function StatCard({ label, value, color, trend }) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        {trend && <Sparkline data={trend} color={color} />}
      </View>
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
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
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
