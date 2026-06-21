import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { type DateType } from 'react-native-ui-datepicker';
import { colors, fonts, radii, spacing } from '../../constants/theme';

interface DateRangeValue {
  startDate: Date | null;
  endDate: Date | null;
}

interface BaseDateFieldProps {
  label: string;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

interface DateFieldProps extends BaseDateFieldProps {
  mode?: 'single' | 'range';
  value?: Date | null;
  onChange?: (d: Date | null) => void;
  rangeValue?: DateRangeValue;
  onRangeChange?: (range: DateRangeValue) => void;
}

function toDate(value: DateType | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatSingleDate(value: Date): string {
  return value.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRangeDate(value: DateRangeValue, placeholder: string): string {
  if (!value.startDate && !value.endDate) return placeholder;
  if (value.startDate && !value.endDate) {
    return `${value.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ...`;
  }
  if (!value.startDate && value.endDate) {
    return `... - ${value.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  return `${value.startDate!.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${value.endDate!.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export function DateField(props: DateFieldProps) {
  const {
    label,
    placeholder = 'Select a date',
    minimumDate,
    maximumDate,
  } = props;

  const mode = props.mode ?? 'single';
  const [showPicker, setShowPicker] = useState(false);
  const currentRange = props.rangeValue ?? { startDate: null, endDate: null };
  const currentValue = props.value ?? null;

  const displayText =
    mode === 'range'
      ? formatRangeDate(currentRange, placeholder)
      : currentValue
        ? formatSingleDate(currentValue)
        : placeholder;

  const hasValue =
    mode === 'range'
      ? Boolean(currentRange.startDate || currentRange.endDate)
      : Boolean(currentValue);

  function clearValue() {
    if (mode === 'range') {
      props.onRangeChange?.({ startDate: null, endDate: null });
    } else {
      props.onChange?.(null);
    }
    setShowPicker(false);
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setShowPicker(s => !s)}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        <Text style={hasValue ? styles.value : styles.placeholder}>{displayText}</Text>
        {hasValue ? (
          <TouchableOpacity
            onPress={clearValue}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.chevron}>{showPicker ? '▲' : '▽'}</Text>
        )}
      </TouchableOpacity>
      {showPicker && (
        <View style={styles.pickerWrapper}>
          {mode === 'range' ? (
            <DateTimePicker
              mode="range"
              startDate={currentRange.startDate ?? undefined}
              endDate={currentRange.endDate ?? undefined}
              minDate={minimumDate}
              maxDate={maximumDate}
              onChange={({ startDate, endDate }) => {
                const next = { startDate: toDate(startDate), endDate: toDate(endDate) };
                props.onRangeChange?.(next);
                if (next.startDate && next.endDate) {
                  setShowPicker(false);
                }
              }}
            />
          ) : (
            <DateTimePicker
              mode="single"
              date={currentValue ?? undefined}
              minDate={minimumDate}
              maxDate={maximumDate}
              onChange={({ date }) => {
                const next = toDate(date);
                props.onChange?.(next);
                if (next) {
                  setShowPicker(false);
                }
              }}
            />
          )}
        </View>
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
  pickerWrapper: { backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
});
