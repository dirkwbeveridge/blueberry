import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, fonts, radii, spacing } from '../../constants/theme';

interface TimeFieldProps {
  label:        string;
  value:        Date | null;
  onChange:     (d: Date | null) => void;
  placeholder?: string;
}

function defaultTime(): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

export function TimeField({ label, value, onChange, placeholder = 'Select a time' }: TimeFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setShowPicker(s => !s)}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {value
            ? value.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : placeholder}
        </Text>
        {value ? (
          <TouchableOpacity
            onPress={() => { onChange(null); setShowPicker(false); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.chevron}>{showPicker ? '▲' : '▽'}</Text>
        )}
      </TouchableOpacity>
      {showPicker && (
        <View style={styles.spinnerWrapper}>
          <DateTimePicker
            value={value ?? defaultTime()}
            mode="time"
            display="spinner"
            onChange={(_, selected) => { if (selected) onChange(selected); }}
            style={styles.spinner}
          />
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => setShowPicker(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:       { gap: spacing.xs },
  label:         { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.text },
  trigger:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 14 },
  value:         { fontFamily: fonts.body.medium, fontSize: 15, color: colors.text },
  placeholder:   { fontFamily: fonts.body.regular, fontSize: 15, color: colors.textMuted },
  clearBtn:      { fontFamily: fonts.body.medium, fontSize: 14, color: colors.textMuted },
  chevron:       { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  spinnerWrapper:{ backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  spinner:       { height: 160 },
  doneBtn:       { backgroundColor: colors.primary, marginHorizontal: spacing.md, marginBottom: spacing.md, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: 'center' },
  doneBtnText:   { fontFamily: fonts.body.semibold, fontSize: 15, color: '#FFFFFF' },
});
