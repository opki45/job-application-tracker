import { View, Text, StyleSheet } from 'react-native';
import { colors, statusTint, radius } from '../theme';

// Read-only version of StatusPicker's pill -- used anywhere a status is
// displayed but not editable inline (Applications list rows, candidate
// cards' confidence row). Tapping it does nothing; StatusPicker is the
// interactive one.
export default function StatusPill({ status, size = 'md' }) {
  return (
    <View style={[styles.pill, size === 'sm' && styles.pillSm, { backgroundColor: statusTint[status] }]}>
      <Text style={[styles.text, size === 'sm' && styles.textSm, { color: colors.status[status] }]}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  textSm: {
    fontSize: 11,
  },
});
