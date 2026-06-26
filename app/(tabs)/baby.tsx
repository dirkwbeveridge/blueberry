import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BabyCalendarPane } from '../../components/baby/BabyCalendarPane';
import { BabyStatsBar } from '../../components/postpartum/BabyStatsBar';
import { Card } from '../../components/ui/Card';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { getPostpartumWeekContent } from '../../constants/postpartumContent';
import { colors, fonts, spacing } from '../../constants/theme';
import { useHousehold } from '../../hooks/useHousehold';
import { getNightShiftStatusLabel, usePostpartumSync } from '../../hooks/usePostpartumSync';
import { getPostpartumAgeLabel, getPostpartumWeek } from '../../lib/postpartumWeeks';

interface TrackerRow {
  key: string;
  emoji: string;
  label: string;
  sub: string;
  route?: string;
}

const TRACKERS: TrackerRow[] = [
  { key: 'feeding', emoji: '🍼', label: 'Feeding', sub: 'Breast L/R, bottle, formula, timer support', route: '/(modals)/baby-tracker?tracker=feeding' },
  { key: 'pumping', emoji: '🥛', label: 'Pumping', sub: 'Track side, minutes, and total expressed milk', route: '/(modals)/baby-tracker?tracker=pumping' },
  { key: 'solids', emoji: '🥣', label: 'Solids', sub: 'Food, amount, and reaction notes in one log', route: '/(modals)/baby-tracker?tracker=solids' },
  { key: 'sleep', emoji: '😴', label: 'Sleep', sub: 'Track naps, overnight blocks, and wake windows', route: '/(modals)/baby-tracker?tracker=sleep' },
  { key: 'diaper', emoji: '🧷', label: 'Diaper', sub: 'Wet/dirty counts and trend visibility', route: '/(modals)/baby-tracker?tracker=diaper' },
  { key: 'milestones', emoji: '📈', label: 'Milestones', sub: 'Weekly notes and developmental checkpoints', route: '/(modals)/baby-tracker?tracker=milestones' },
  { key: 'pediatric', emoji: '🩺', label: 'Pediatric visits', sub: 'Appointments, questions, and follow-ups', route: '/(modals)/baby-tracker?tracker=pediatric' },
  { key: 'handoff', emoji: '🔁', label: 'Night-shift handoff', sub: 'Shared shift log for both parents', route: '/(tabs)/together' },
];

function getNightShiftStatusValue(payload: Record<string, unknown> | null): 'starting' | 'ending' | 'need-help' {
  const value = payload?.status;
  return value === 'ending' || value === 'need-help' ? value : 'starting';
}

export default function BabyScreen() {
  const { household, isPostpartum } = useHousehold();
  const { stats, latestNightShiftEvent } = usePostpartumSync(household?.id ?? null);

  if (!isPostpartum) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Baby" subtitle="Family Mode" />
        <Card style={styles.card}>
          <Text style={styles.title}>Family Mode is not active yet</Text>
          <Text style={styles.body}>
            Set your baby&apos;s birthday to switch Blueberry to postpartum tracking for both parents.
          </Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.push('/(modals)/baby-arrived' as never)}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaLabel}>Begin Family Mode</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    );
  }

  const week = getPostpartumWeek(household?.baby_dob ?? null);
  const guidance = getPostpartumWeekContent(week);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="Baby"
        subtitle={`${getPostpartumAgeLabel(household?.baby_dob ?? null)}${household?.baby_name ? ` · ${household.baby_name}` : ''}`}
      />

      <BabyStatsBar stats={stats} />

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>This week focus</Text>
        <View style={styles.focusBlock}>
          <Text style={styles.focusLabel}>Mom recovery</Text>
          <Text style={styles.body}>{guidance.momRecovery}</Text>
        </View>
        <View style={styles.focusBlock}>
          <Text style={styles.focusLabel}>Partner support</Text>
          <Text style={styles.body}>{guidance.partnerFocus}</Text>
        </View>
        <View style={styles.focusBlock}>
          <Text style={styles.focusLabel}>Baby focus</Text>
          <Text style={styles.body}>{guidance.babyFocus}</Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Shared handoff status</Text>
        <Text style={styles.body}>
          {latestNightShiftEvent
            ? `${getNightShiftStatusLabel(getNightShiftStatusValue(latestNightShiftEvent.payload))} · updated ${new Date(latestNightShiftEvent.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
            : 'No night-shift handoff shared yet.'}
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Trackers</Text>
        {TRACKERS.map((item, index) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.row, index < TRACKERS.length - 1 && styles.rowBorder]}
            onPress={() => router.push((item.route ?? '/(tabs)/baby') as never)}
            activeOpacity={0.75}
          >
            <Text style={styles.rowEmoji}>{item.emoji}</Text>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowSub}>{item.sub}</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </TouchableOpacity>
        ))}
      </Card>

      <BabyCalendarPane householdId={household?.id ?? null} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.heading.semibold,
    fontSize: 18,
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.body.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  ctaBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ctaLabel: {
    color: colors.surface,
    fontFamily: fonts.body.semibold,
    fontSize: 13,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.heading.semibold,
    fontSize: 17,
  },
  focusBlock: {
    gap: 2,
  },
  focusLabel: {
    color: colors.primary,
    fontFamily: fonts.body.semibold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  rowEmoji: {
    fontSize: 22,
    textAlign: 'center',
    width: 28,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    color: colors.text,
    fontFamily: fonts.body.semibold,
    fontSize: 15,
  },
  rowSub: {
    color: colors.textMuted,
    fontFamily: fonts.body.regular,
    fontSize: 12,
  },
  chev: {
    color: colors.textMuted,
    fontSize: 22,
    lineHeight: 22,
  },
});
