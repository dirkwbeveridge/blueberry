import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../../constants/theme';
import { getDaysUntilDue } from '../../lib/pregnancy';
import { ProgressBar } from '../ui/ProgressBar';

interface TrimesterProgressProps {
  week:      number;
  dueDateIso: string | null;
}

export function TrimesterProgress({ week, dueDateIso }: TrimesterProgressProps) {
  const progress  = Math.max(0, Math.min(week / 40, 1));
  const daysLeft  = dueDateIso ? getDaysUntilDue(dueDateIso) : null;
  const trimester = week <= 13 ? 1 : week <= 26 ? 2 : 3;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Trimester {trimester}</Text>
        {daysLeft !== null && daysLeft > 0 && (
          <Text style={styles.daysLeft}>{daysLeft} days to go</Text>
        )}
      </View>
      <ProgressBar progress={progress} height={8} color={colors.accent} />
      <View style={styles.ticks}>
        {['w1', 'w13', 'w26', 'w40'].map(w => (
          <Text key={w} style={styles.tick}>{w}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:     { fontFamily: fonts.body.semibold, fontSize: 13, color: colors.text },
  daysLeft:  { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  ticks:     { flexDirection: 'row', justifyContent: 'space-between' },
  tick:      { fontFamily: fonts.body.regular, fontSize: 10, color: colors.textMuted },
});
