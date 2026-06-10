import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, fonts, radii, spacing } from '../../constants/theme';

interface DateFieldProps {
  label:        string;
  value:        Date | null;
  onChange:     (d: Date | null) => void;
  placeholder?: string;
  minimumDate?: Date;
}

export function DateField({ label, value, onChange, placeholder = 'Select a date', minimumDate }: DateFieldProps) {
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
            ? value.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
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
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display="inline"
          minimumDate={minimumDate}
          onChange={(_, selected) => {
            if (selected) { onChange(selected); setShowPicker(false); }
          }}
          accentColor={colors.primary}
          style={styles.picker}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:     { gap: spacing.xs },
  label:       { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.text },
  trigger:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 14 },
  value:       { fontFamily: fonts.body.medium, fontSize: 15, color: colors.text },
  placeholder: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.textMuted },
  clearBtn:    { fontFamily: fonts.body.medium, fontSize: 14, color: colors.textMuted },
  chevron:     { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  picker:      { backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden' },
});
