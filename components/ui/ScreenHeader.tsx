import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../../constants/theme';

interface ScreenHeaderProps {
  title:    string;
  subtitle?: string;
  action?:  React.ReactNode;
}

export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.actionSlot}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  textBlock:  { flex: 1 },
  title:      { fontFamily: fonts.heading.bold, fontSize: 26, color: colors.text, lineHeight: 32 },
  subtitle:   { fontFamily: fonts.body.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  actionSlot: { marginLeft: spacing.md },
});
