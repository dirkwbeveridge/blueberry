import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, fonts, radii, spacing } from '../../constants/theme';

interface ChipProps {
  label:          string;
  selected:       boolean;
  onPress:        () => void;
  emoji?:         string;
  /** Override the border/text color when selected. Defaults to `colors.primary`. */
  selectedColor?: string;
  /** Override the background when selected. Defaults to `colors.primaryTint`. */
  selectedBg?:    string;
  /** Additional style applied to the outer TouchableOpacity (e.g. flex: 1). */
  style?:         ViewStyle;
}

export function Chip({
  label,
  selected,
  onPress,
  emoji,
  selectedColor = colors.primary,
  selectedBg    = colors.primaryTint,
  style,
}: ChipProps) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && { borderColor: selectedColor, backgroundColor: selectedBg },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <Text style={[styles.label, selected && { color: selectedColor }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  emoji: { fontSize: 16 },
  label: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.textMuted },
});
