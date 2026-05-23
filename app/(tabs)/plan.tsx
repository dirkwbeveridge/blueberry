import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useHousehold } from '../../hooks/useHousehold';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { colors, fonts, radii, spacing, priorityColors } from '../../constants/theme';
import type { Appointment, Priority, Todo } from '../../types';

type PlanTab = 'todos' | 'appointments';

const PRIORITY_BADGE: Record<Priority, 'error'|'warning'|'success'> = {
  high:'error', medium:'warning', low:'success',
};

function formatApptDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0)  return 'Past';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export default function PlanScreen() {
  const { household } = useHousehold();
  const [activeTab,   setActiveTab]   = useState<PlanTab>('todos');
  const [todos,       setTodos]       = useState<Todo[]>([]);
  const [appointments,setAppointments]= useState<Appointment[]>([]);
  const [todosLoading,  setTodosLoading]  = useState(true);
  const [apptsLoading,  setApptsLoading]  = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [showDone,      setShowDone]      = useState(false);

  const fetchTodos = useCallback(async () => {
    if (!household) return;
    setTodosLoading(true);
    const { data } = await supabase
      .from('todos').select('*')
      .eq('household_id', household.id)
      .order('is_done', { ascending: true })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });
    setTodos(data ?? []);
    setTodosLoading(false);
  }, [household]);

  const fetchAppointments = useCallback(async () => {
    if (!household) return;
    setApptsLoading(true);
    const { data } = await supabase
      .from('appointments').select('*')
      .eq('household_id', household.id)
      .order('appointment_date', { ascending: true });
    setAppointments(data ?? []);
    setApptsLoading(false);
  }, [household]);

  useEffect(() => { fetchTodos(); fetchAppointments(); }, [fetchTodos, fetchAppointments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchTodos(), fetchAppointments()]);
    setRefreshing(false);
  }, [fetchTodos, fetchAppointments]);

  useRealtimeSync<Record<string, unknown>>({
    table: 'todos', householdId: household?.id ?? null,
    onInsert: (p) => setTodos(prev => [...prev, p as unknown as Todo]),
    onUpdate: (p) => { const t = p as unknown as Todo; setTodos(prev => prev.map(x => x.id === t.id ? t : x)); },
    onDelete: ({ id }) => setTodos(prev => prev.filter(t => t.id !== id)),
  });

  async function toggleTodo(todo: Todo) {
    const newDone = !todo.is_done;
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, is_done: newDone } : t));
    await supabase.from('todos').update({ is_done: newDone }).eq('id', todo.id);
  }

  async function deleteAppointment(id: string) {
    Alert.alert('Delete appointment?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setAppointments(prev => prev.filter(a => a.id !== id));
        await supabase.from('appointments').delete().eq('id', id);
      }},
    ]);
  }

  const activeTodos = todos.filter(t => !t.is_done);
  const doneTodos   = todos.filter(t => t.is_done);
  const upcoming    = appointments.filter(a => new Date(a.appointment_date) >= new Date());
  const past        = appointments.filter(a => new Date(a.appointment_date) < new Date());

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Plan</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push(activeTab === 'todos' ? '/(modals)/add-todo' : '/(modals)/add-appointment')}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Segment control */}
      <View style={styles.segmentBar}>
        {(['todos', 'appointments'] as PlanTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.segment, activeTab === tab && styles.segmentActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentLabel, activeTab === tab && styles.segmentLabelActive]}>
              {tab === 'todos' ? `✅  Todos${activeTodos.length > 0 ? ` (${activeTodos.length})` : ''}` : `📅  Appointments`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── TODOS ── */}
        {activeTab === 'todos' && (
          <>
            {todosLoading ? (
              <Text style={styles.loadingText}>Loading…</Text>
            ) : activeTodos.length === 0 && doneTodos.length === 0 ? (
              <Card>
                <View style={styles.empty}>
                  <Text style={styles.emptyEmoji}>✅</Text>
                  <Text style={styles.emptyTitle}>No tasks yet</Text>
                  <Text style={styles.emptyBody}>Add tasks to keep track of everything you need to do before baby arrives.</Text>
                  <TouchableOpacity style={styles.emptyAction} onPress={() => router.push('/(modals)/add-todo')}>
                    <Text style={styles.emptyActionText}>Add your first task</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ) : (
              <>
                {/* Active todos */}
                {activeTodos.length > 0 && (
                  <Card>
                    <Text style={styles.subSectionLabel}>To do ({activeTodos.length})</Text>
                    {activeTodos.map((todo, i) => (
                      <TouchableOpacity
                        key={todo.id}
                        style={[styles.todoRow, i < activeTodos.length - 1 && styles.todoRowBorder]}
                        onPress={() => toggleTodo(todo)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.checkbox} />
                        <View style={styles.todoBody}>
                          <Text style={styles.todoTitle}>{todo.title}</Text>
                          <View style={styles.todoMeta}>
                            <Badge label={todo.priority} variant={PRIORITY_BADGE[todo.priority]} />
                            {todo.source === 'ai' && <Badge label="✨ AI" variant="accent" />}
                            {todo.due_date && (
                              <Text style={styles.todoDue}>Due {todo.due_date}</Text>
                            )}
                          </View>
                        </View>
                        <View style={[styles.priorityDot, { backgroundColor: priorityColors[todo.priority] }]} />
                      </TouchableOpacity>
                    ))}
                  </Card>
                )}
                {/* Done todos toggle */}
                {doneTodos.length > 0 && (
                  <TouchableOpacity
                    style={styles.doneToggle}
                    onPress={() => setShowDone(s => !s)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.doneToggleText}>
                      {showDone ? '▲' : '▽'}  Completed ({doneTodos.length})
                    </Text>
                  </TouchableOpacity>
                )}
                {showDone && doneTodos.length > 0 && (
                  <Card style={styles.doneCard}>
                    {doneTodos.map((todo, i) => (
                      <TouchableOpacity
                        key={todo.id}
                        style={[styles.todoRow, i < doneTodos.length - 1 && styles.todoRowBorder]}
                        onPress={() => toggleTodo(todo)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.checkboxDone}>
                          <Text style={styles.checkmark}>✓</Text>
                        </View>
                        <Text style={styles.todoTitleDone}>{todo.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {/* ── APPOINTMENTS ── */}
        {activeTab === 'appointments' && (
          <>
            {apptsLoading ? (
              <Text style={styles.loadingText}>Loading…</Text>
            ) : upcoming.length === 0 && past.length === 0 ? (
              <Card>
                <View style={styles.empty}>
                  <Text style={styles.emptyEmoji}>📅</Text>
                  <Text style={styles.emptyTitle}>No appointments yet</Text>
                  <Text style={styles.emptyBody}>Log your prenatal appointments so you both always know what is coming up.</Text>
                  <TouchableOpacity style={styles.emptyAction} onPress={() => router.push('/(modals)/add-appointment')}>
                    <Text style={styles.emptyActionText}>Add first appointment</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <Card>
                    <Text style={styles.subSectionLabel}>Upcoming</Text>
                    {upcoming.map((appt, i) => {
                      const label = daysUntil(appt.appointment_date);
                      const isToday = label === 'Today';
                      return (
                        <TouchableOpacity
                          key={appt.id}
                          style={[styles.apptRow, i < upcoming.length - 1 && styles.apptRowBorder]}
                          onLongPress={() => deleteAppointment(appt.id)}
                          activeOpacity={0.85}
                        >
                          <View style={[styles.apptDateBadge, isToday && styles.apptDateBadgeToday]}>
                            <Text style={[styles.apptDateNum, isToday && styles.apptDateNumToday]}>
                              {new Date(appt.appointment_date).getDate()}
                            </Text>
                            <Text style={[styles.apptDateMon, isToday && styles.apptDateMonToday]}>
                              {new Date(appt.appointment_date).toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.apptBody}>
                            <Text style={styles.apptTitle}>{appt.title}</Text>
                            <Text style={styles.apptTime}>{formatApptDate(appt.appointment_date)}</Text>
                            {appt.location && <Text style={styles.apptLocation}>📍 {appt.location}</Text>}
                          </View>
                          <View style={[styles.apptUrgency, isToday && styles.apptUrgencyToday]}>
                            <Text style={[styles.apptUrgencyText, isToday && styles.apptUrgencyTextToday]}>{label}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </Card>
                )}
                {past.length > 0 && (
                  <Card style={styles.pastCard}>
                    <Text style={styles.subSectionLabel}>Past</Text>
                    {past.map((appt, i) => (
                      <TouchableOpacity
                        key={appt.id}
                        style={[styles.apptRow, i < past.length - 1 && styles.apptRowBorder, styles.apptRowPast]}
                        onLongPress={() => deleteAppointment(appt.id)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.apptDateBadgePast}>
                          <Text style={styles.apptDateNumPast}>{new Date(appt.appointment_date).getDate()}</Text>
                          <Text style={styles.apptDateMonPast}>
                            {new Date(appt.appointment_date).toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.apptBody}>
                          <Text style={styles.apptTitlePast}>{appt.title}</Text>
                          <Text style={styles.apptTimePast}>{formatApptDate(appt.appointment_date)}</Text>
                          {appt.location && <Text style={styles.apptLocationPast}>📍 {appt.location}</Text>}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </Card>
                )}
                <Text style={styles.longPressHint}>Long-press an appointment to delete it</Text>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: colors.background },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md },
  headerTitle: { fontFamily: fonts.heading.bold, fontSize: 26, color: colors.text },
  addBtn:   { backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText:{ fontFamily: fonts.body.semibold, fontSize: 14, color: '#FFFFFF' },
  segmentBar:{ flexDirection: 'row', marginHorizontal: spacing.lg, backgroundColor: colors.border, borderRadius: radii.md, padding: 3, marginBottom: spacing.md },
  segment:  { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.surface, shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  segmentLabel: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.textMuted },
  segmentLabelActive: { color: colors.primary, fontFamily: fonts.body.semibold },
  scroll:   { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  loadingText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted, marginTop: spacing.md },
  subSectionLabel: { fontFamily: fonts.body.semibold, fontSize: 12, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.md },
  // Todos
  todoRow:  { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.md, gap: spacing.md },
  todoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.accent, marginTop: 2 },
  checkboxDone: { width: 22, height: 22, borderRadius: 6, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkmark:{ color: '#FFF', fontSize: 13, fontFamily: fonts.body.semibold },
  todoBody: { flex: 1, gap: 4 },
  todoTitle:{ fontFamily: fonts.body.medium, fontSize: 15, color: colors.text, lineHeight: 22 },
  todoTitleDone: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.textMuted, textDecorationLine: 'line-through', flex: 1 },
  todoMeta: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', alignItems: 'center' },
  todoDue:  { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  doneToggle: { paddingVertical: spacing.sm },
  doneToggleText: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.textMuted },
  doneCard: { opacity: 0.7 },
  // Appointments
  apptRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  apptRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  apptRowPast: { opacity: 0.65 },
  apptDateBadge: { width: 48, height: 52, borderRadius: radii.md, backgroundColor: '#F5F0FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.accent },
  apptDateBadgeToday: { backgroundColor: colors.primary, borderColor: colors.primary },
  apptDateNum: { fontFamily: fonts.heading.bold, fontSize: 18, color: colors.primary },
  apptDateNumToday: { color: '#FFF' },
  apptDateMon: { fontFamily: fonts.body.semibold, fontSize: 9, color: colors.textMuted, letterSpacing: 0.5 },
  apptDateMonToday: { color: 'rgba(255,255,255,0.8)' },
  apptDateBadgePast: { width: 48, height: 52, borderRadius: radii.md, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  apptDateNumPast: { fontFamily: fonts.heading.bold, fontSize: 18, color: colors.textMuted },
  apptDateMonPast: { fontFamily: fonts.body.semibold, fontSize: 9, color: colors.textMuted, letterSpacing: 0.5 },
  apptBody: { flex: 1, gap: 2 },
  apptTitle: { fontFamily: fonts.body.semibold, fontSize: 15, color: colors.text },
  apptTitlePast: { fontFamily: fonts.body.semibold, fontSize: 15, color: colors.textMuted },
  apptTime:  { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  apptTimePast: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  apptLocation: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  apptLocationPast: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  apptUrgency: { backgroundColor: '#F5F0FF', borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 4 },
  apptUrgencyToday: { backgroundColor: colors.primary },
  apptUrgencyText: { fontFamily: fonts.body.semibold, fontSize: 11, color: colors.primary },
  apptUrgencyTextToday: { color: '#FFF' },
  pastCard: {},
  longPressHint: { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: -spacing.xs },
  // Empty states
  empty:    { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontFamily: fonts.heading.semibold, fontSize: 18, color: colors.text },
  emptyBody:  { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyAction:{ marginTop: spacing.xs, backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: 20, paddingVertical: 10 },
  emptyActionText: { fontFamily: fonts.body.semibold, fontSize: 14, color: '#FFFFFF' },
});
