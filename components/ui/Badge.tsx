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
  success: { bg: colors.successTint,  text: colors.success   },
  warning: { bg: colors.warningTint,  text: colors.warning   },
  error:   { bg: colors.errorTint,    text: colors.error     },
  accent:  { bg: colors.primaryTint,  text: colors.primary   },
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
