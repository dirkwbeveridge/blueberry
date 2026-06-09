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

type PlanTab = 'todos' | 'appointments' | 'calendar';

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
        <Text style={styles.headerTitle}>To Do</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push(activeTab === 'appointments' ? '/(modals)/add-appointment' : '/(modals)/add-todo')}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Segment control */}
      <View style={styles.segmentBar}>
        {(['todos', 'appointments', 'calendar'] as PlanTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.segment, activeTab === tab && styles.segmentActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentLabel, activeTab === tab && styles.segmentLabelActive]}>
              {tab === 'todos'        ? `✅  Todos${activeTodos.length > 0 ? ` (${activeTodos.length})` : ''}` :
               tab === 'appointments' ? `📅  Appts` :
                                        `🗓  Calendar`}
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

        {/* ── CALENDAR ── */}
        {activeTab === 'calendar' && (
          <CalendarPane
            todos={todos}
            appointments={appointments}
            onToggleTodo={toggleTodo}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Calendar pane — 14-day strip + full month view, toggled
// ───────────────────────────────────────────────────────────────────────────

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function CalendarPane({
  todos, appointments, onToggleTodo,
}: {
  todos:        Todo[];
  appointments: Appointment[];
  onToggleTodo: (t: Todo) => void;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [selectedKey, setSelectedKey] = useState(toDateKey(today));
  const [viewMode,    setViewMode]    = useState<'week' | 'month'>('week');
  const [monthDate,   setMonthDate]   = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const todosByDate: Record<string, Todo[]> = {};
  for (const t of todos) {
    if (!t.due_date || t.is_done) continue;
    const key = t.due_date.slice(0, 10);
    (todosByDate[key] ??= []).push(t);
  }
  const apptsByDate: Record<string, Appointment[]> = {};
  for (const a of appointments) {
    const key = a.appointment_date.slice(0, 10);
    (apptsByDate[key] ??= []).push(a);
  }

  const selectedTodos = todosByDate[selectedKey] ?? [];
  const selectedAppts = apptsByDate[selectedKey] ?? [];
  const isEmpty = selectedTodos.length === 0 && selectedAppts.length === 0;
  const selectedDate  = new Date(selectedKey + 'T12:00:00');
  const selectedLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // 14-day strip
  const stripDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i); return d;
  });

  // Month grid
  const year  = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDow   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  function prevMonth() {
    setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  return (
    <>
      {/* View toggle */}
      <View style={calStyles.viewToggle}>
        {(['week', 'month'] as const).map(m => (
          <TouchableOpacity
            key={m}
            style={[calStyles.viewToggleBtn, viewMode === m && calStyles.viewToggleBtnActive]}
            onPress={() => setViewMode(m)}
            activeOpacity={0.7}
          >
            <Text style={[calStyles.viewToggleLabel, viewMode === m && calStyles.viewToggleLabelActive]}>
              {m === 'week' ? '14-Day' : 'Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── WEEK STRIP ── */}
      {viewMode === 'week' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={calStyles.strip}>
          {stripDays.map(d => {
            const key        = toDateKey(d);
            const isSelected = key === selectedKey;
            const isToday    = key === toDateKey(today);
            const count      = (todosByDate[key]?.length ?? 0) + (apptsByDate[key]?.length ?? 0);
            return (
              <TouchableOpacity
                key={key}
                style={[calStyles.day, isSelected && calStyles.daySelected]}
                onPress={() => setSelectedKey(key)}
                activeOpacity={0.7}
              >
                <Text style={[calStyles.dayWeek, isSelected && calStyles.dayWeekSelected]}>
                  {d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3).toUpperCase()}
                </Text>
                <Text style={[calStyles.dayNum, isSelected && calStyles.dayNumSelected]}>{d.getDate()}</Text>
                {count > 0 && <View style={[calStyles.dot, isSelected && calStyles.dotSelected]} />}
                {isToday && !isSelected && <View style={calStyles.todayUnderline} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── MONTH GRID ── */}
      {viewMode === 'month' && (
        <View style={calStyles.monthContainer}>
          {/* Month navigation */}
          <View style={calStyles.monthHeader}>
            <TouchableOpacity onPress={prevMonth} style={calStyles.monthNavBtn} activeOpacity={0.7}>
              <Text style={calStyles.monthNavArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={calStyles.monthTitle}>
              {monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={calStyles.monthNavBtn} activeOpacity={0.7}>
              <Text style={calStyles.monthNavArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={calStyles.dowRow}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <Text key={d} style={calStyles.dowLabel}>{d}</Text>
            ))}
          </View>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <View key={wi} style={calStyles.weekRow}>
              {week.map((dayNum, di) => {
                if (!dayNum) return <View key={di} style={calStyles.monthCell} />;
                const d         = new Date(year, month, dayNum);
                const key       = toDateKey(d);
                const isSelected = key === selectedKey;
                const isToday    = key === toDateKey(today);
                const count      = (todosByDate[key]?.length ?? 0) + (apptsByDate[key]?.length ?? 0);
                return (
                  <TouchableOpacity
                    key={di}
                    style={[
                      calStyles.monthCell,
                      isToday    && calStyles.monthCellToday,
                      isSelected && calStyles.monthCellSelected,
                    ]}
                    onPress={() => setSelectedKey(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      calStyles.monthDayNum,
                      isToday    && calStyles.monthDayNumToday,
                      isSelected && calStyles.monthDayNumSelected,
                    ]}>
                      {dayNum}
                    </Text>
                    {count > 0 && (
                      <View style={[calStyles.monthDot, isSelected && calStyles.monthDotSelected]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}

      {/* Selected day header */}
      <Text style={calStyles.selectedHeader}>{selectedLabel}</Text>

      {/* Items for selected day */}
      {isEmpty ? (
        <Card>
          <View style={calStyles.empty}>
            <Text style={calStyles.emptyEmoji}>🗓</Text>
            <Text style={calStyles.emptyText}>Nothing scheduled.</Text>
          </View>
        </Card>
      ) : (
        <>
          {selectedAppts.length > 0 && (
            <Card>
              <Text style={calStyles.groupLabel}>Appointments</Text>
              {selectedAppts.map((appt, i) => (
                <View key={appt.id} style={[calStyles.apptItem, i < selectedAppts.length - 1 && calStyles.itemBorder]}>
                  <Text style={calStyles.apptTime}>{formatApptDate(appt.appointment_date)}</Text>
                  <Text style={calStyles.apptTitle}>{appt.title}</Text>
                  {appt.location && <Text style={calStyles.apptLoc}>📍 {appt.location}</Text>}
                </View>
              ))}
            </Card>
          )}
          {selectedTodos.length > 0 && (
            <Card>
              <Text style={calStyles.groupLabel}>Todos</Text>
              {selectedTodos.map((t, i) => (
                <TouchableOpacity
                  key={t.id}
                  style={[calStyles.todoItem, i < selectedTodos.length - 1 && calStyles.itemBorder]}
                  onPress={() => onToggleTodo(t)}
                  activeOpacity={0.7}
                >
                  <View style={calStyles.checkbox} />
                  <Text style={calStyles.todoTitle}>{t.title}</Text>
                  <Badge label={t.priority} variant={PRIORITY_BADGE[t.priority]} />
                </TouchableOpacity>
              ))}
            </Card>
          )}
        </>
      )}
    </>
  );
}

const calStyles = StyleSheet.create({
  // View toggle
  viewToggle:            { flexDirection: 'row', backgroundColor: colors.border, borderRadius: radii.md, padding: 3, marginBottom: spacing.sm },
  viewToggleBtn:         { flex: 1, paddingVertical: spacing.xs, borderRadius: radii.sm, alignItems: 'center' },
  viewToggleBtnActive:   { backgroundColor: colors.surface },
  viewToggleLabel:       { fontFamily: fonts.body.medium, fontSize: 13, color: colors.textMuted },
  viewToggleLabelActive: { color: colors.primary, fontFamily: fonts.body.semibold },

  // 14-day strip
  strip:           { gap: 6, paddingVertical: spacing.xs },
  day:             { width: 52, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radii.md, backgroundColor: colors.surface, gap: 2 },
  daySelected:     { backgroundColor: colors.primary },
  dayWeek:         { fontFamily: fonts.body.semibold, fontSize: 10, color: colors.textMuted, letterSpacing: 0.5 },
  dayWeekSelected: { color: 'rgba(255,255,255,0.75)' },
  dayNum:          { fontFamily: fonts.heading.bold, fontSize: 18, color: colors.text },
  dayNumSelected:  { color: '#FFFFFF' },
  dot:             { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, marginTop: 2 },
  dotSelected:     { backgroundColor: '#FFFFFF' },
  todayUnderline:  { width: 16, height: 2, borderRadius: 1, backgroundColor: colors.primary, marginTop: 2 },

  // Month grid
  monthContainer:      { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs },
  monthHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  monthNavBtn:         { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthNavArrow:       { fontFamily: fonts.heading.bold, fontSize: 22, color: colors.primary },
  monthTitle:          { fontFamily: fonts.heading.semibold, fontSize: 16, color: colors.text },
  dowRow:              { flexDirection: 'row', marginBottom: 4 },
  dowLabel:            { flex: 1, textAlign: 'center', fontFamily: fonts.body.semibold, fontSize: 11, color: colors.textMuted },
  weekRow:             { flexDirection: 'row' },
  monthCell:           { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, gap: 2 },
  monthCellToday:      { borderWidth: 1.5, borderColor: colors.primary },
  monthCellSelected:   { backgroundColor: colors.primary },
  monthDayNum:         { fontFamily: fonts.body.medium, fontSize: 14, color: colors.text },
  monthDayNumToday:    { color: colors.primary, fontFamily: fonts.body.semibold },
  monthDayNumSelected: { color: '#FFFFFF', fontFamily: fonts.body.semibold },
  monthDot:            { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent },
  monthDotSelected:    { backgroundColor: 'rgba(255,255,255,0.8)' },

  // Selected day + items
  selectedHeader:  { fontFamily: fonts.heading.semibold, fontSize: 16, color: colors.text, marginTop: spacing.sm },
  groupLabel:      { fontFamily: fonts.body.semibold, fontSize: 12, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  itemBorder:      { borderBottomWidth: 1, borderBottomColor: colors.border },
  apptItem:        { paddingVertical: spacing.md, gap: 2 },
  apptTime:        { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted },
  apptTitle:       { fontFamily: fonts.body.semibold, fontSize: 15, color: colors.text },
  apptLoc:         { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  todoItem:        { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  checkbox:        { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: colors.accent },
  todoTitle:       { fontFamily: fonts.body.medium, fontSize: 14, color: colors.text, flex: 1 },
  empty:           { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  emptyEmoji:      { fontSize: 32 },
  emptyText:       { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted },
});

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
