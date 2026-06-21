import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import type { Appointment, Priority, Todo } from '../../types';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { SegmentedControl } from '../ui/SegmentedControl';

const PRIORITY_BADGE: Record<Priority, 'error' | 'warning' | 'success'> = {
  high: 'error',
  medium: 'warning',
  low: 'success',
};

function formatApptDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface CalendarPaneProps {
  todos: Todo[];
  appointments: Appointment[];
  onToggleTodo: (todo: Todo) => void;
}

export function CalendarPane({ todos, appointments, onToggleTodo }: CalendarPaneProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [selectedKey, setSelectedKey] = useState(toDateKey(today));
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [monthDate, setMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const todosByDate: Record<string, Todo[]> = {};
  for (const todo of todos) {
    if (!todo.due_date || todo.is_done) continue;
    const key = todo.due_date.slice(0, 10);
    (todosByDate[key] ??= []).push(todo);
  }

  const apptsByDate: Record<string, Appointment[]> = {};
  for (const appt of appointments) {
    const key = appt.appointment_date.slice(0, 10);
    (apptsByDate[key] ??= []).push(appt);
  }

  const selectedTodos = todosByDate[selectedKey] ?? [];
  const selectedAppts = apptsByDate[selectedKey] ?? [];
  const isEmpty = selectedTodos.length === 0 && selectedAppts.length === 0;
  const selectedDate = new Date(`${selectedKey}T12:00:00`);
  const selectedLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const stripDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  function prevMonth() {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function nextMonth() {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  return (
    <>
      <SegmentedControl
        options={[
          { value: 'week', label: '14-Day' },
          { value: 'month', label: 'Month' },
        ]}
        value={viewMode}
        onChange={(value) => setViewMode(value as 'week' | 'month')}
      />

      {viewMode === 'week' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {stripDays.map((d) => {
            const key = toDateKey(d);
            const isSelected = key === selectedKey;
            const isToday = key === toDateKey(today);
            const count = (todosByDate[key]?.length ?? 0) + (apptsByDate[key]?.length ?? 0);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.day, isSelected && styles.daySelected]}
                onPress={() => setSelectedKey(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayWeek, isSelected && styles.dayWeekSelected]}>
                  {d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3).toUpperCase()}
                </Text>
                <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>{d.getDate()}</Text>
                {count > 0 && <View style={[styles.dot, isSelected && styles.dotSelected]} />}
                {isToday && !isSelected && <View style={styles.todayUnderline} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {viewMode === 'month' && (
        <View style={styles.monthContainer}>
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
              <Text style={styles.monthNavArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
              <Text style={styles.monthNavArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dowRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <Text key={day} style={styles.dowLabel}>{day}</Text>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((dayNum, di) => {
                if (!dayNum) return <View key={di} style={styles.monthCell} />;
                const d = new Date(year, month, dayNum);
                const key = toDateKey(d);
                const isSelected = key === selectedKey;
                const isToday = key === toDateKey(today);
                const count = (todosByDate[key]?.length ?? 0) + (apptsByDate[key]?.length ?? 0);
                return (
                  <TouchableOpacity
                    key={di}
                    style={[styles.monthCell, isToday && styles.monthCellToday, isSelected && styles.monthCellSelected]}
                    onPress={() => setSelectedKey(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.monthDayNum, isToday && styles.monthDayNumToday, isSelected && styles.monthDayNumSelected]}>
                      {dayNum}
                    </Text>
                    {count > 0 && <View style={[styles.monthDot, isSelected && styles.monthDotSelected]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}

      <Text style={styles.selectedHeader}>{selectedLabel}</Text>

      {isEmpty ? (
        <Card>
          <EmptyState emoji="🗓" title="Nothing scheduled." />
        </Card>
      ) : (
        <>
          {selectedAppts.length > 0 && (
            <Card>
              <Text style={styles.groupLabel}>Appointments</Text>
              {selectedAppts.map((appt, i) => (
                <View key={appt.id} style={[styles.apptItem, i < selectedAppts.length - 1 && styles.itemBorder]}>
                  <Text style={styles.apptTime}>{formatApptDate(appt.appointment_date)}</Text>
                  <Text style={styles.apptTitle}>{appt.title}</Text>
                  {appt.location && <Text style={styles.apptLoc}>📍 {appt.location}</Text>}
                </View>
              ))}
            </Card>
          )}
          {selectedTodos.length > 0 && (
            <Card>
              <Text style={styles.groupLabel}>Todos</Text>
              {selectedTodos.map((todo, i) => (
                <TouchableOpacity
                  key={todo.id}
                  style={[styles.todoItem, i < selectedTodos.length - 1 && styles.itemBorder]}
                  onPress={() => onToggleTodo(todo)}
                  activeOpacity={0.7}
                >
                  <View style={styles.checkbox} />
                  <Text style={styles.todoTitle}>{todo.title}</Text>
                  <Badge label={todo.priority} variant={PRIORITY_BADGE[todo.priority]} />
                </TouchableOpacity>
              ))}
            </Card>
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  strip: { gap: 6, paddingVertical: spacing.xs },
  day: { width: 52, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radii.md, backgroundColor: colors.surface, gap: 2 },
  daySelected: { backgroundColor: colors.primary },
  dayWeek: { fontFamily: fonts.body.semibold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.5 },
  dayWeekSelected: { color: 'rgba(255,255,255,0.75)' },
  dayNum: { fontFamily: fonts.heading.bold, fontSize: 20, color: colors.text },
  dayNumSelected: { color: colors.surface },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, marginTop: 2 },
  dotSelected: { backgroundColor: colors.surface },
  todayUnderline: { width: 16, height: 2, borderRadius: 1, backgroundColor: colors.primary, marginTop: 2 },

  monthContainer: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  monthNavBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthNavArrow: { fontFamily: fonts.heading.bold, fontSize: 22, color: colors.primary },
  monthTitle: { fontFamily: fonts.heading.semibold, fontSize: 16, color: colors.text },
  dowRow: { flexDirection: 'row', marginBottom: 4 },
  dowLabel: { flex: 1, textAlign: 'center', fontFamily: fonts.body.semibold, fontSize: 11, color: colors.textMuted },
  weekRow: { flexDirection: 'row' },
  monthCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, gap: 2 },
  monthCellToday: { borderWidth: 1.5, borderColor: colors.primary },
  monthCellSelected: { backgroundColor: colors.primary },
  monthDayNum: { fontFamily: fonts.body.medium, fontSize: 14, color: colors.text },
  monthDayNumToday: { color: colors.primary, fontFamily: fonts.body.semibold },
  monthDayNumSelected: { color: colors.surface, fontFamily: fonts.body.semibold },
  monthDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent },
  monthDotSelected: { backgroundColor: 'rgba(255,255,255,0.8)' },

  selectedHeader: { fontFamily: fonts.heading.semibold, fontSize: 16, color: colors.text, marginTop: spacing.sm },
  groupLabel: { fontFamily: fonts.body.semibold, fontSize: 12, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  apptItem: { paddingVertical: spacing.md, gap: 2 },
  apptTime: { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted },
  apptTitle: { fontFamily: fonts.body.semibold, fontSize: 15, color: colors.text },
  apptLoc: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  todoItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: colors.accent },
  todoTitle: { fontFamily: fonts.body.medium, fontSize: 14, color: colors.text, flex: 1 },
});
