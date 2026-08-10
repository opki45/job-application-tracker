import { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { colors, statusTint, radius } from '../theme';

const STATUSES = ['applied', 'interviewing', 'offer', 'rejected', 'accepted'];

// Stands in for the web app's <select className="status-select">: React
// Native has no native dropdown, so tapping the pill opens a small modal
// list instead. Same 5 statuses, same colors.
export default function StatusPicker({ status, onChange }) {
  const [open, setOpen] = useState(false);

  function select(next) {
    setOpen(false);
    if (next !== status) onChange(next);
  }

  return (
    <>
      <Pressable
        style={[styles.pill, { backgroundColor: statusTint[status] }]}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.pillText, { color: colors.status[status] }]}>{status}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Set status</Text>
            {STATUSES.map((s) => (
              <Pressable key={s} style={styles.option} onPress={() => select(s)}>
                <View style={[styles.dot, { backgroundColor: colors.status[s] }]} />
                <Text style={[styles.optionText, s === status && styles.optionTextActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,20,30,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    padding: 20,
    paddingBottom: 36,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
    textTransform: 'capitalize',
  },
  optionTextActive: {
    fontWeight: '800',
  },
});
