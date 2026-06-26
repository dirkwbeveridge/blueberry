import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '../../constants/theme';
import type { PostpartumStats } from '../../types';

interface BabyStatsBarProps {
  stats: PostpartumStats;
}

function formatSleep(minutes: number): string {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

export function BabyStatsBar({ stats }: BabyStatsBarProps) {
  return (
    <View style={styles.row}>
      <View style={styles.statCard}>
        <Text style={styles.value}>{stats.feedingsToday}</Text>
        <Text style={styles.label}>Feedings today</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.value}>{stats.diapersToday}</Text>
        <Text style={styles.label}>Diapers today</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.value}>{formatSleep(stats.sleepMinutesToday)}</Text>
        <Text style={styles.label}>Sleep tracked</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  value: {
    color: colors.primary,
    fontFamily: fonts.heading.semibold,
    fontSize: 20,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.body.regular,
    fontSize: 11,
    lineHeight: 15,
  },
});
