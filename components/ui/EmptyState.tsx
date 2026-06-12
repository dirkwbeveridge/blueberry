import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../../constants/theme';

interface EmptyStateProps {
  emoji:   string;
  title:   string;
  body?:   string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ emoji, title, body, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {action ? (
        <TouchableOpacity
          style={styles.pill}
          onPress={action.onPress}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={styles.pillText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  emoji:     { fontSize: 36 },
  title:     { fontFamily: fonts.heading.semibold, fontSize: 18, color: colors.text },
  body:      { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  pill:      { marginTop: spacing.xs, backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: 20, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  pillText:  { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.surface },
});
