import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DatePicker from 'react-native-date-picker';
import { colors, fonts, radii, spacing } from '../../constants/theme';

type MinuteInterval = 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;

interface TimeFieldProps {
  label:        string;
  value:        Date | null;
  onChange:     (d: Date | null) => void;
  placeholder?: string;
  minuteInterval?: MinuteInterval;
  // Kept for backward compatibility with existing callsites.
  display?:     'default' | 'spinner' | 'compact' | 'inline';
}

function defaultTime(): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

export function TimeField({ label, value, onChange, placeholder = 'Select a time', minuteInterval = 5 }: TimeFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setShowPicker(true)}
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
          <Text style={styles.chevron}>▽</Text>
        )}
      </TouchableOpacity>
      <DatePicker
        modal
        mode="time"
        open={showPicker}
        date={value ?? defaultTime()}
        minuteInterval={minuteInterval}
        onConfirm={(selected) => {
          onChange(selected);
          setShowPicker(false);
        }}
        onCancel={() => setShowPicker(false)}
      />
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
});
