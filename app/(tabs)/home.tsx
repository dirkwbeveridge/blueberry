import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { QuickActions } from '../../components/home/QuickActions';
import { TodoList } from '../../components/home/TodoList';
import { TrimesterProgress } from '../../components/home/TrimesterProgress';
import { WeekHeroCard } from '../../components/home/WeekHeroCard';
import { BabyStatsBar } from '../../components/postpartum/BabyStatsBar';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { getPostpartumWeekContent } from '../../constants/postpartumContent';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import { useHousehold } from '../../hooks/useHousehold';
import { getNightShiftStatusLabel, usePostpartumSync } from '../../hooks/usePostpartumSync';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { getPostpartumWeek } from '../../lib/postpartumWeeks';
import { supabase } from '../../lib/supabase';
import type { BabyLog, HealthLog, Todo } from '../../types';

const MOOD_EMOJI: Record<string, string> = {
  great: '😄',
  good: '🙂',
  okay: '😐',
  tired: '😴',
  anxious: '😟',
  emotional: '🥹',
  nauseous: '🤢',
  happy: '😊',
};

const POSTPARTUM_ACTIONS = [
  { label: 'Log feeding', emoji: '🍼', route: '/(modals)/baby-tracker?tracker=feeding' },
  { label: 'Log sleep', emoji: '😴', route: '/(modals)/baby-tracker?tracker=sleep' },
  { label: 'Night handoff', emoji: '🔁', route: '/(tabs)/together' },
];

function formatBabyLogSummary(log: BabyLog): string {
  const details = log.details ?? {};
  if (log.log_type === 'feeding') {
    const pieces = [
      typeof details.method === 'string' ? details.method : null,
      typeof details.side === 'string' ? details.side : null,
      typeof details.amountMl === 'number' ? `${details.amountMl} ml` : null,
      typeof details.durationMins === 'number' ? `${details.durationMins}m` : null,
    ];
    return pieces.filter(Boolean).join(' · ');
  }

  if (log.log_type === 'sleep') {
    const pieces = [
      typeof details.sleepType === 'string' ? details.sleepType : null,
      typeof details.durationMins === 'number' ? `${details.durationMins}m` : null,
    ];
    return pieces.filter(Boolean).join(' · ');
  }

  if (log.log_type === 'diaper') {
    const pieces = [
      typeof details.diaperType === 'string' ? details.diaperType : null,
      typeof details.count === 'number' ? `${details.count}x` : null,
    ];
    return pieces.filter(Boolean).join(' · ');
  }

  if (log.log_type === 'pumping') {
    const pieces = [
      typeof details.amountMl === 'number' ? `${details.amountMl} ml` : null,
      typeof details.durationMins === 'number' ? `${details.durationMins}m` : null,
    ];
    return pieces.filter(Boolean).join(' · ');
  }

  if (log.log_type === 'solids') {
    const pieces = [
      typeof details.food === 'string' ? details.food : null,
      typeof details.amountTsp === 'number' ? `${details.amountTsp} tsp` : null,
    ];
    return pieces.filter(Boolean).join(' · ');
  }

  const status = typeof details.status === 'string' ? details.status : null;
  return status ? getNightShiftStatusLabel(status as never) : 'Shift updated';
}

function getNightShiftStatusValue(payload: Record<string, unknown> | null): 'starting' | 'ending' | 'need-help' {
  const value = payload?.status;
  return value === 'ending' || value === 'need-help' ? value : 'starting';
}

export default function HomeScreen() {
  const { household, currentUser, currentWeek, isMotherRole, isPostpartum } = useHousehold();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [pendingTodoIds, setPendingTodoIds] = useState<string[]>([]);
  const [latestLog, setLatestLog] = useState<HealthLog | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { stats, recentLogs, latestNightShiftEvent, refresh: refreshPostpartum } = usePostpartumSync(household?.id ?? null);

  const sortTodosForHome = useCallback((list: Todo[]) => {
    return [...list]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 5);
  }, []);

  const fetchData = useCallback(async () => {
    if (!household) return;

    const { data: todosData } = await supabase
      .from('todos')
      .select('*')
      .eq('household_id', household.id)
      .eq('is_done', false)
      .order('created_at', { ascending: true })
      .limit(5);

    setTodos(todosData ?? []);

    if (!isMotherRole || isPostpartum) {
      setLatestLog(null);
      return;
    }

    const { data: logsData } = await supabase
      .from('health_logs')
      .select('*')
      .eq('household_id', household.id)
      .order('logged_at', { ascending: false })
      .limit(1);

    setLatestLog(logsData?.[0] ?? null);
  }, [household, isMotherRole, isPostpartum]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), isPostpartum ? refreshPostpartum() : Promise.resolve()]);
    setRefreshing(false);
  }, [fetchData, isPostpartum, refreshPostpartum]);

  useRealtimeSync<Record<string, unknown>>({
    table: 'todos',
    householdId: household?.id ?? null,
    onInsert: (payload) => setTodos((prev) => sortTodosForHome([...prev, payload as unknown as Todo])),
    onUpdate: (payload) => {
      const todo = payload as unknown as Todo;
      if (todo.is_done) {
        setTodos((prev) => prev.filter((item) => item.id !== todo.id));
        return;
      }
      setTodos((prev) => prev.map((item) => (item.id === todo.id ? todo : item)));
    },
    onDelete: ({ id }) => setTodos((prev) => prev.filter((todo) => todo.id !== id)),
  });

  async function toggleTodo(todo: Todo) {
    if (pendingTodoIds.includes(todo.id)) return;

    setPendingTodoIds((prev) => [...prev, todo.id]);
    try {
      const { error } = await supabase.from('todos').update({ is_done: true }).eq('id', todo.id);
      if (error) throw error;
      setTodos((prev) => prev.filter((item) => item.id !== todo.id));
    } catch {
      // Keep the task visible if the update fails so users can retry.
    } finally {
      setPendingTodoIds((prev) => prev.filter((id) => id !== todo.id));
    }
  }

  const displayName = currentUser?.display_name ?? currentUser?.role ?? 'there';
  const greeting = displayName ? `Hi, ${displayName}` : 'Hello';
  const postpartumWeek = getPostpartumWeek(household?.baby_dob ?? null);
  const postpartumContent = getPostpartumWeekContent(postpartumWeek);
  const babyName = household?.baby_name ?? 'baby';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.subGreeting}>
          {isPostpartum ? `Week ${postpartumWeek} postpartum with ${babyName}` : household?.baby_name ? `Tracking ${household.baby_name}'s journey` : 'Shared care in one place'}
        </Text>
      </View>

      {isPostpartum ? (
        <>
          <Card style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Family mode</Text>
            <Text style={styles.heroTitle}>This week needs clear support, not guesswork.</Text>
            <Text style={styles.heroBody}>
              {isMotherRole ? postpartumContent.momRecovery : postpartumContent.partnerFocus}
            </Text>
            <Text style={styles.heroHint}>{postpartumContent.babyFocus}</Text>
          </Card>

          <BabyStatsBar stats={stats} />

          <Card>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest baby activity</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/baby')} accessibilityRole="button">
                <Text style={styles.seeAll}>Baby tab</Text>
              </TouchableOpacity>
            </View>
            {recentLogs.length === 0 ? (
              <Text style={styles.setupHint}>As you log feeds, diapers, sleep, and handoffs, the household snapshot will show up here.</Text>
            ) : (
              <View style={styles.activityList}>
                {recentLogs.slice(0, 3).map((log, index) => (
                  <View key={log.id} style={[styles.activityRow, index < Math.min(recentLogs.length, 3) - 1 && styles.activityRowBorder]}>
                    <View style={styles.activityText}>
                      <Text style={styles.activityTitle}>{log.log_type.charAt(0).toUpperCase() + log.log_type.slice(1)}</Text>
                      <Text style={styles.activitySub}>{formatBabyLogSummary(log) || 'Logged'}</Text>
                    </View>
                    <Text style={styles.activityTime}>
                      {new Date(log.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Night coverage</Text>
            <Text style={styles.setupHint}>
              {latestNightShiftEvent
                ? `${getNightShiftStatusLabel(getNightShiftStatusValue(latestNightShiftEvent.payload))} · updated ${new Date(latestNightShiftEvent.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                : 'No handoff has been shared yet today.'}
            </Text>
          </Card>
        </>
      ) : (
        <>
          {currentWeek === 0 && (
            <Card>
              <Text style={styles.sectionTitle}>Journey setup</Text>
              <Text style={styles.setupHint}>
                Week tracking appears after a due date is set for pregnancy. Family Mode tracking is available in the Baby tab for postpartum.
              </Text>
            </Card>
          )}

          {currentWeek > 0 && <WeekHeroCard week={currentWeek} household={household} />}

          {currentWeek > 0 && household?.due_date && (
            <Card>
              <TrimesterProgress week={currentWeek} dueDateIso={household.due_date} />
            </Card>
          )}

          {isMotherRole && latestLog && (
            <Card>
              <Text style={styles.sectionTitle}>Latest log</Text>
              <View style={styles.logRow}>
                {latestLog.mood && <Text style={styles.moodEmoji}>{MOOD_EMOJI[latestLog.mood] ?? '🙂'}</Text>}
                <View style={styles.logBody}>
                  {latestLog.symptoms && latestLog.symptoms.length > 0 && (
                    <View style={styles.symptomRow}>
                      {latestLog.symptoms.slice(0, 3).map((symptom) => (
                        <Badge key={symptom} label={symptom} variant="accent" />
                      ))}
                    </View>
                  )}
                  {latestLog.notes && <Text style={styles.logNote} numberOfLines={1}>{latestLog.notes}</Text>}
                  <Text style={styles.logTime}>
                    {new Date(latestLog.logged_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        </>
      )}

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Open tasks</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/todo')}
            accessibilityRole="button"
            accessibilityLabel="Open all tasks"
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <TodoList todos={todos} onToggle={toggleTodo} pendingTodoIds={pendingTodoIds} />
      </Card>

      <Text style={styles.sectionLabel}>Quick actions</Text>
      {isPostpartum ? (
        <View style={styles.quickActionRow}>
          {POSTPARTUM_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickBtn}
              onPress={() => router.push(action.route as never)}
              activeOpacity={0.8}
            >
              <Text style={styles.quickBtnEmoji}>{action.emoji}</Text>
              <Text style={styles.quickBtnLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <QuickActions />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { gap: 2, marginBottom: spacing.xs },
  greeting: { fontFamily: fonts.heading.bold, fontSize: 26, color: colors.text },
  subGreeting: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted },
  heroCard: { backgroundColor: colors.primaryTint, gap: spacing.sm },
  heroEyebrow: { fontFamily: fonts.body.semibold, fontSize: 11, color: colors.primary, letterSpacing: 1, textTransform: 'uppercase' },
  heroTitle: { fontFamily: fonts.heading.semibold, fontSize: 21, color: colors.text, lineHeight: 28 },
  heroBody: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.text, lineHeight: 21 },
  heroHint: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  sectionTitle: { fontFamily: fonts.heading.semibold, fontSize: 17, color: colors.text, marginBottom: spacing.md },
  setupHint: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionLabel: { fontFamily: fonts.body.semibold, fontSize: 13, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  seeAll: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.primary },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  moodEmoji: { fontSize: 28 },
  logBody: { flex: 1, gap: 4 },
  symptomRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  logNote: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  logTime: { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted },
  activityList: { gap: 0 },
  activityRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  activityRowBorder: { borderBottomColor: colors.border, borderBottomWidth: 1 },
  activityText: { flex: 1, gap: 2 },
  activityTitle: { color: colors.text, fontFamily: fonts.body.semibold, fontSize: 14 },
  activitySub: { color: colors.textMuted, fontFamily: fonts.body.regular, fontSize: 12 },
  activityTime: { color: colors.textMuted, fontFamily: fonts.body.regular, fontSize: 11 },
  quickActionRow: { flexDirection: 'row', gap: spacing.sm },
  quickBtn: {
    flex: 1,
    minHeight: 88,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    gap: spacing.xs,
    justifyContent: 'center',
    padding: spacing.md,
    shadowColor: colors.primary,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickBtnEmoji: { fontSize: 22 },
  quickBtnLabel: { color: colors.text, fontFamily: fonts.body.medium, fontSize: 12, textAlign: 'center' },
});
