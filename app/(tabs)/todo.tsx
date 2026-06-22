import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { CalendarPane } from '../../components/todo/CalendarPane';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { colors, fonts, priorityColors, radii, spacing } from '../../constants/theme';
import { useHousehold } from '../../hooks/useHousehold';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { deleteAppleCalendarEvent } from '../../lib/appleCalendar';
import { getValidAccessToken } from '../../lib/googleAuth';
import { deleteCalendarEvent } from '../../lib/googleCalendarApi';
import { cancelAppointmentReminderByAppointmentId } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
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

function sortAppointments(items: Appointment[]) {
  return [...items].sort(
    (left, right) => new Date(left.appointment_date).getTime() - new Date(right.appointment_date).getTime()
  );
}

function upsertAppointment(items: Appointment[], appointment: Appointment) {
  return sortAppointments([...items.filter((item) => item.id !== appointment.id), appointment]);
}

function openEditAppointment(appointmentId: string) {
  router.push({
    pathname: '/(modals)/edit-appointment',
    params: { appointmentId },
  } as never);
}

export default function PlanScreen() {
  const { household, currentUser } = useHousehold();
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
    setAppointments(sortAppointments(data ?? []));
    setApptsLoading(false);
  }, [household]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchTodos();
      void fetchAppointments();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchTodos, fetchAppointments]);

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

  useRealtimeSync<Record<string, unknown>>({
    table: 'appointments',
    householdId: household?.id ?? null,
    onInsert: (payload) => {
      const appointment = payload as unknown as Appointment;
      setAppointments((prev) => upsertAppointment(prev, appointment));
    },
    onUpdate: (payload) => {
      const appointment = payload as unknown as Appointment;
      setAppointments((prev) => upsertAppointment(prev, appointment));
    },
    onDelete: ({ id }) => {
      setAppointments((prev) => prev.filter((appointment) => appointment.id !== id));
    },
  });

  async function toggleTodo(todo: Todo) {
    const newDone = !todo.is_done;
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, is_done: newDone } : t)));
    const { error } = await supabase.from('todos').update({ is_done: newDone }).eq('id', todo.id);
    if (error) {
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, is_done: todo.is_done } : t)));
      Alert.alert('Could not update task', 'Please try again.');
    }
  }

  async function deleteAppointment(appointment: Appointment) {
    Alert.alert('Delete appointment?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const previousAppointments = appointments;
        setAppointments((prev) => prev.filter((a) => a.id !== appointment.id));
        try {
          try {
            await cancelAppointmentReminderByAppointmentId(appointment.id);
          } catch {
            // Reminder cancellation is best-effort. Deleting the appointment remains the source of truth.
          }

          const { error } = await supabase.from('appointments').delete().eq('id', appointment.id);
          if (error) {
            throw error;
          }

          if (appointment.google_event_id && currentUser?.id) {
            try {
              const accessToken = await getValidAccessToken(currentUser.id);
              if (accessToken) {
                await deleteCalendarEvent(accessToken, appointment.google_event_id);
              }
            } catch (googleDeleteError) {
              console.warn('Google Calendar delete sync failed', googleDeleteError);
            }
          }

          if (appointment.apple_event_id) {
            try {
              await deleteAppleCalendarEvent(appointment.apple_event_id);
            } catch (appleDeleteError) {
              console.warn('Apple Calendar delete sync failed', appleDeleteError);
            }
          }
        } catch {
          setAppointments(previousAppointments);
          Alert.alert('Could not delete appointment', 'Please try again.');
        }
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
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="To Do"
          action={
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push(activeTab === 'appointments' ? '/(modals)/add-appointment' : '/(modals)/add-todo')}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          }
        />
      </View>

      {/* Segment control */}
      <View style={styles.segmentWrap}>
        <SegmentedControl
          options={[
            { value: 'todos',        label: `✅  Todos${activeTodos.length > 0 ? ` (${activeTodos.length})` : ''}` },
            { value: 'appointments', label: '📅  Appointments' },
            { value: 'calendar',     label: '🗓  Calendar' },
          ]}
          value={activeTab}
          onChange={(v) => setActiveTab(v as PlanTab)}
        />
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
                <EmptyState
                  emoji="✅"
                  title="No tasks yet"
                  body="Add tasks to keep track of everything you need to do before baby arrives."
                  action={{ label: 'Add your first task', onPress: () => router.push('/(modals)/add-todo') }}
                />
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
                    accessibilityRole="button"
                    accessibilityLabel={showDone ? 'Hide completed tasks' : 'Show completed tasks'}
                  >
                    <Text style={styles.doneToggleText}>
                      {showDone ? 'Hide completed' : 'Show completed'} ({doneTodos.length})
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
                <EmptyState
                  emoji="📅"
                  title="No appointments yet"
                  body="Log your prenatal appointments so you both always know what is coming up."
                  action={{ label: 'Add first appointment', onPress: () => router.push('/(modals)/add-appointment') }}
                />
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
                          onPress={() => openEditAppointment(appt.id)}
                          onLongPress={() => deleteAppointment(appt)}
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
                          <View style={styles.apptActions}>
                            <View style={[styles.apptUrgency, isToday && styles.apptUrgencyToday]}>
                              <Text style={[styles.apptUrgencyText, isToday && styles.apptUrgencyTextToday]}>{label}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.apptDeleteBtn}
                              onPress={() => deleteAppointment(appt)}
                              activeOpacity={0.75}
                              accessibilityRole="button"
                              accessibilityLabel={`Delete appointment ${appt.title}`}
                            >
                              <Text style={styles.apptDeleteText}>Delete</Text>
                            </TouchableOpacity>
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
                        onPress={() => openEditAppointment(appt.id)}
                        onLongPress={() => deleteAppointment(appt)}
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
                        <TouchableOpacity
                          style={styles.apptDeleteBtn}
                          onPress={() => deleteAppointment(appt)}
                          activeOpacity={0.75}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete appointment ${appt.title}`}
                        >
                          <Text style={styles.apptDeleteText}>Delete</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </Card>
                )}
                <Text style={styles.longPressHint}>Use Delete on each row, or long-press an appointment</Text>
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

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: colors.background },
  headerWrap:   { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md },
  addBtn:       { backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: 16, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  addBtnText:   { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.surface },
  segmentWrap:  { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  scroll:       { flex: 1 },
  scrollContent:{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  loadingText:  { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted, marginTop: spacing.md },
  subSectionLabel: { fontFamily: fonts.body.semibold, fontSize: 12, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.md },
  // Todos
  todoRow:      { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.md, gap: spacing.md },
  todoRowBorder:{ borderBottomWidth: 1, borderBottomColor: colors.border },
  checkbox:     { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.accent, marginTop: 2 },
  checkboxDone: { width: 22, height: 22, borderRadius: 6, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkmark:    { color: colors.surface, fontSize: 13, fontFamily: fonts.body.semibold },
  todoBody:     { flex: 1, gap: 4 },
  todoTitle:    { fontFamily: fonts.body.medium, fontSize: 15, color: colors.text, lineHeight: 22 },
  todoTitleDone:{ fontFamily: fonts.body.regular, fontSize: 15, color: colors.textMuted, textDecorationLine: 'line-through', flex: 1 },
  todoMeta:     { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', alignItems: 'center' },
  todoDue:      { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted },
  priorityDot:  { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  doneToggle:   { paddingVertical: spacing.sm },
  doneToggleText: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.textMuted },
  doneCard:     { opacity: 0.7 },
  // Appointments
  apptRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  apptRowBorder:{ borderBottomWidth: 1, borderBottomColor: colors.border },
  apptRowPast:  { opacity: 0.65 },
  apptDateBadge:{ width: 48, height: 52, borderRadius: radii.md, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.accent },
  apptDateBadgeToday: { backgroundColor: colors.primary, borderColor: colors.primary },
  apptDateNum:  { fontFamily: fonts.heading.bold, fontSize: 18, color: colors.primary },
  apptDateNumToday: { color: colors.surface },
  apptDateMon:  { fontFamily: fonts.body.semibold, fontSize: 9, color: colors.textMuted, letterSpacing: 0.5 },
  apptDateMonToday: { color: 'rgba(255,255,255,0.8)' },
  apptDateBadgePast: { width: 48, height: 52, borderRadius: radii.md, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  apptDateNumPast: { fontFamily: fonts.heading.bold, fontSize: 18, color: colors.textMuted },
  apptDateMonPast: { fontFamily: fonts.body.semibold, fontSize: 9, color: colors.textMuted, letterSpacing: 0.5 },
  apptBody:     { flex: 1, gap: 2 },
  apptTitle:    { fontFamily: fonts.body.semibold, fontSize: 15, color: colors.text },
  apptTitlePast:{ fontFamily: fonts.body.semibold, fontSize: 15, color: colors.textMuted },
  apptTime:     { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  apptTimePast: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  apptLocation: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  apptLocationPast: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  apptUrgency:  { backgroundColor: colors.primaryTint, borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 4 },
  apptUrgencyToday: { backgroundColor: colors.primary },
  apptUrgencyText: { fontFamily: fonts.body.semibold, fontSize: 11, color: colors.primary },
  apptUrgencyTextToday: { color: colors.surface },
  apptActions: { alignItems: 'flex-end', gap: spacing.xs },
  apptDeleteBtn: {
    minHeight: 44,
    minWidth: 56,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  apptDeleteText: { fontFamily: fonts.body.medium, fontSize: 12, color: colors.textMuted },
  pastCard:     {},
  longPressHint:{ fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: -spacing.xs },
});
