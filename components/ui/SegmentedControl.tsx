import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../../constants/theme';

interface Option {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  options:  Option[];
  value:    string;
  onChange: (value: string) => void;
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <View style={styles.bar}>
      {options.map(opt => {
        const selected = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.segment, selected && styles.segmentActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.label}
          >
            <Text style={[styles.label, selected && styles.labelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar:           { flexDirection: 'row', backgroundColor: colors.border, borderRadius: radii.md, padding: 3 },
  segment:       { flex: 1, minHeight: 44, paddingVertical: spacing.sm, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.surface, shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  label:         { fontFamily: fonts.body.medium, fontSize: 13, color: colors.textMuted },
  labelActive:   { color: colors.primary, fontFamily: fonts.body.semibold },
});
