import { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

// Generalized version of StatusPicker's modal-sheet pattern (React Native
// has no native <select>). Takes { value, label } options and a plain
// label/value pair for the trigger -- used for the Applications status
// filter and the Analytics range/granularity dropdowns, so those don't each
// reinvent the same bottom-sheet.
export default function PickerField({ label, value, options, onChange, title }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  function select(next) {
    setOpen(false);
    if (next !== value) onChange(next);
  }

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText}>{label ? `${label}: ` : ''}{current ? current.label : value}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            {title ? <Text style={styles.sheetTitle}>{title}</Text> : null}
            {options.map((o) => (
              <Pressable key={o.value} style={styles.option} onPress={() => select(o.value)}>
                <Text style={[styles.optionText, o.value === value && styles.optionTextActive]}>
                  {o.label}
                </Text>
                {o.value === value && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  triggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
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
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
    textTransform: 'capitalize',
  },
  optionTextActive: {
    fontWeight: '800',
    color: colors.primary,
  },
});
