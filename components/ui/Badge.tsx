import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../../constants/theme';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'accent';

interface BadgeProps {
  label:    string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: colors.border,       text: colors.textMuted },
  success: { bg: '#E8F8ED',           text: colors.success   },
  warning: { bg: '#FEF3E8',           text: colors.warning   },
  error:   { bg: '#FEF0ED',           text: colors.error     },
  accent:  { bg: '#F5F0FF',           text: colors.primary   },
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const v = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      <Text style={[styles.label, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.full, alignSelf: 'flex-start' },
  label: { fontFamily: fonts.body.semibold, fontSize: 11, textTransform: 'capitalize' },
});
