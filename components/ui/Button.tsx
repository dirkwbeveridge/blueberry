import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radii, spacing } from '../../constants/theme';

interface ButtonProps extends PropsWithChildren {
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({
  disabled = false,
  label,
  loading = false,
  onPress,
  style,
  variant = 'primary',
}: ButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}>
      <Text style={[styles.label, variant !== 'primary' && styles.secondaryLabel]}>
        {loading ? 'Working...' : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.full,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    color: colors.surface,
    fontFamily: fonts.body.semibold,
    fontSize: 16,
  },
  secondaryLabel: {
    color: colors.primary,
  },
});

export default Button;
