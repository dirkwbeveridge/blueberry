import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const isMultiline = Boolean(props.multiline);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, isMultiline && styles.inputMultiline, error ? styles.inputError : null, style]}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={props.accessibilityLabel ?? label}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:    { gap: spacing.xs },
  label:      { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.text },
  input: {
    minHeight: 52, height: 52, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, paddingHorizontal: spacing.md,
    fontFamily: fonts.body.regular, fontSize: 15, color: colors.text,
  },
  inputMultiline: {
    height: undefined,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    textAlignVertical: 'top',
  },
  inputError: { borderColor: colors.error },
  errorText:  { fontFamily: fonts.body.regular, fontSize: 12, color: colors.error },
});
