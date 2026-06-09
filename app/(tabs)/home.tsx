import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useHousehold } from '../../hooks/useHousehold';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { WeekHeroCard }      from '../../components/home/WeekHeroCard';
import { TrimesterProgress } from '../../components/home/TrimesterProgress';
import { TodoList }          from '../../components/home/TodoList';
import { QuickActions }      from '../../components/home/QuickActions';
import { Card }              from '../../components/ui/Card';
import { Badge }             from '../../components/ui/Badge';
import { colors, fonts, spacing } from '../../constants/theme';
import type { HealthLog, Todo } from '../../types';

const MOOD_EMOJI: Record<string, string> = {
  great:'😄', good:'🙂', okay:'😐', tired:'😴',
  anxious:'😟', emotional:'🥹', nauseous:'🤢', happy:'😊',
};

export default function HomeScreen() {
  const { household, currentUser, currentWeek } = useHousehold();
  const [todos,      setTodos]      = useState<Todo[]>([]);
  const [latestLog,  setLatestLog]  = useState<HealthLog | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!household) return;
    const [{ data: todosData }, { data: logsData }] = await Promise.all([
      supabase.from('todos').select('*').eq('household_id', household.id).eq('is_done', false).order('created_at', { ascending: true }).limit(5),
      supabase.from('health_logs').select('*').eq('household_id', household.id).order('logged_at', { ascending: false }).limit(1),
    ]);
    setTodos(todosData ?? []);
    setLatestLog(logsData?.[0] ?? null);
  }, [household]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useRealtimeSync<Record<string, unknown>>({
    table: 'todos', householdId: household?.id ?? null,
    onInsert: (p) => setTodos(prev => [...prev, p as unknown as Todo].slice(0, 5)),
    onUpdate: (p) => { const t = p as unknown as Todo; if (t.is_done) setTodos(prev => prev.filter(x => x.id !== t.id)); else setTodos(prev => prev.map(x => x.id === t.id ? t : x)); },
    onDelete: ({ id }) => setTodos(prev => prev.filter(t => t.id !== id)),
  });

  async function toggleTodo(todo: Todo) {
    setTodos(prev => prev.filter(t => t.id !== todo.id));
    await supabase.from('todos').update({ is_done: true }).eq('id', todo.id);
  }

  const displayName = currentUser?.display_name ?? currentUser?.role ?? 'there';
  const greeting    = displayName ? `Hi, ${displayName}` : 'Hello';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Greeting */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting} 👋</Text>
        {household?.baby_name && (
          <Text style={styles.subGreeting}>Tracking {household.baby_name} journey</Text>
        )}
      </View>

      {/* Week hero */}
      {currentWeek > 0 && <WeekHeroCard week={currentWeek} household={household} />}

      {/* Trimester progress */}
      {currentWeek > 0 && household?.due_date && (
        <Card>
          <TrimesterProgress week={currentWeek} dueDateIso={household.due_date} />
        </Card>
      )}

      {/* Latest symptom log */}
      {latestLog && (
        <Card>
          <Text style={styles.sectionTitle}>Latest log</Text>
          <View style={styles.logRow}>
            {latestLog.mood && <Text style={styles.moodEmoji}>{MOOD_EMOJI[latestLog.mood] ?? '🙂'}</Text>}
            <View style={styles.logBody}>
              {latestLog.symptoms && latestLog.symptoms.length > 0 && (
                <View style={styles.symptomRow}>
                  {latestLog.symptoms.slice(0, 3).map(s => <Badge key={s} label={s} variant="accent" />)}
                </View>
              )}
              {latestLog.notes && (
                <Text style={styles.logNote} numberOfLines={1}>{latestLog.notes}</Text>
              )}
              <Text style={styles.logTime}>
                {new Date(latestLog.logged_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Todos */}
      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Open tasks</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/todo')}>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>
        <TodoList todos={todos} onToggle={toggleTodo} />
      </Card>

      {/* Quick actions */}
      <Text style={styles.sectionLabel}>Quick actions</Text>
      <QuickActions />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: colors.background },
  scroll:       { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: 100, gap: spacing.md },
  header:       { gap: 2, marginBottom: spacing.xs },
  greeting:     { fontFamily: fonts.heading.bold, fontSize: 26, color: colors.text },
  subGreeting:  { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted },
  sectionTitle: { fontFamily: fonts.heading.semibold, fontSize: 17, color: colors.text, marginBottom: spacing.md },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionLabel: { fontFamily: fonts.body.semibold, fontSize: 13, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  seeAll:       { fontFamily: fonts.body.medium, fontSize: 13, color: colors.primary },
  logRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  moodEmoji:    { fontSize: 28 },
  logBody:      { flex: 1, gap: 4 },
  symptomRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  logNote:      { fontFamily: fonts.body.regular, fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  logTime:      { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted },
});
