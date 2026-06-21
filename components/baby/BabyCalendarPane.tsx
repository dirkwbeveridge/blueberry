import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { colors, fonts, spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import type { BabyLog, BabyLogType } from '../../types';
import { Card } from '../ui/Card';
import { SegmentedControl } from '../ui/SegmentedControl';

export type BabyCalendarViewMode = 'day' | 'week' | 'month';
export type BabyCalendarCategory = 'all' | BabyLogType;

interface BabyCalendarPaneProps {
  householdId: string | null;
}

interface RangeBounds {
  start: Date;
  endExclusive: Date;
}

const VIEW_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const;

const FILTER_OPTIONS: readonly { value: BabyCalendarCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'feeding', label: 'Feeding' },
  { value: 'pumping', label: 'Pumping' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'solids', label: 'Solids' },
  { value: 'diaper', label: 'Diaper' },
  { value: 'handoff', label: 'Handoff' },
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CATEGORY_COLORS: Record<BabyLogType, string> = {
  feeding: colors.primary,
  pumping: '#4A9A8A',
  sleep: colors.success,
  solids: colors.warning,
  diaper: '#6B86B8',
  handoff: colors.error,
};

function startOfDay(input: Date): Date {
  return new Date(input.getFullYear(), input.getMonth(), input.getDate());
}

function addDays(input: Date, days: number): Date {
  const out = new Date(input);
  out.setDate(out.getDate() + days);
  return out;
}

function startOfWeek(input: Date): Date {
  const day = input.getDay();
  return addDays(startOfDay(input), -day);
}

function endOfWeekExclusive(input: Date): Date {
  return addDays(startOfWeek(input), 7);
}

function startOfMonth(input: Date): Date {
  return new Date(input.getFullYear(), input.getMonth(), 1);
}

function endOfMonthExclusive(input: Date): Date {
  return new Date(input.getFullYear(), input.getMonth() + 1, 1);
}

function toDateKey(input: Date): string {
  const y = input.getFullYear();
  const m = String(input.getMonth() + 1).padStart(2, '0');
  const d = String(input.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDisplayDate(input: Date): string {
  return input.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getBounds(view: BabyCalendarViewMode, anchorDate: Date): RangeBounds {
  if (view === 'day') {
    const start = startOfDay(anchorDate);
    return { start, endExclusive: addDays(start, 1) };
  }

  if (view === 'week') {
    const start = startOfWeek(anchorDate);
    return { start, endExclusive: addDays(start, 7) };
  }

  const monthStart = startOfMonth(anchorDate);
  const monthEndExclusive = endOfMonthExclusive(anchorDate);
  const start = startOfWeek(monthStart);
  const endExclusive = endOfWeekExclusive(addDays(monthEndExclusive, -1));
  return { start, endExclusive };
}

function formatSummary(log: BabyLog): string {
  const details = (log.details ?? {}) as Record<string, unknown>;

  if (log.log_type === 'feeding') {
    return [
      details.method,
      details.side,
      details.durationMins ? `${details.durationMins}m` : null,
      details.amountMl ? `${details.amountMl} ml` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  if (log.log_type === 'pumping') {
    return [
      details.durationMins ? `${details.durationMins}m` : null,
      details.amountMl ? `${details.amountMl} ml` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  if (log.log_type === 'sleep') {
    return [details.sleepType, details.durationMins ? `${details.durationMins}m` : null]
      .filter(Boolean)
      .join(' · ');
  }

  if (log.log_type === 'solids') {
    return [details.food, details.amountTsp ? `${details.amountTsp} tsp` : null, details.reaction]
      .filter(Boolean)
      .join(' · ');
  }

  if (log.log_type === 'diaper') {
    return [details.diaperType, details.count ? `${details.count}x` : null]
      .filter(Boolean)
      .join(' · ');
  }

  return [details.shiftOwner, details.status].filter(Boolean).join(' · ');
}

function titleCase(type: BabyLogType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function BabyCalendarPane({ householdId }: BabyCalendarPaneProps) {
  const [viewMode, setViewMode] = useState<BabyCalendarViewMode>('week');
  const [category, setCategory] = useState<BabyCalendarCategory>('all');
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));
  const [logs, setLogs] = useState<BabyLog[]>([]);
  const [loading, setLoading] = useState(false);

  const bounds = useMemo(() => {
    const date = viewMode === 'month' ? anchorDate : selectedDate;
    return getBounds(viewMode, date);
  }, [viewMode, anchorDate, selectedDate]);

  const visibleDates = useMemo(() => {
    const dates: Date[] = [];
    let cursor = new Date(bounds.start);
    while (cursor < bounds.endExclusive) {
      dates.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return dates;
  }, [bounds]);

  const fetchLogs = useCallback(async () => {
    if (!householdId) {
      setLogs([]);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('baby_logs')
        .select('id, household_id, user_id, log_type, logged_at, details, notes, created_at')
        .eq('household_id', householdId)
        .gte('logged_at', bounds.start.toISOString())
        .lt('logged_at', bounds.endExclusive.toISOString())
        .order('logged_at', { ascending: true });

      if (category !== 'all') {
        query = query.eq('log_type', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data ?? []) as unknown as BabyLog[]);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [householdId, bounds, category]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const logsByDay = useMemo(() => {
    const grouped: Record<string, BabyLog[]> = {};
    for (const log of logs) {
      const key = toDateKey(new Date(log.logged_at));
      grouped[key] = grouped[key] ?? [];
      grouped[key].push(log);
    }
    return grouped;
  }, [logs]);

  const selectedKey = toDateKey(selectedDate);
  const selectedLogs = useMemo(() => logsByDay[selectedKey] ?? [], [logsByDay, selectedKey]);

  const selectedGroups = useMemo(() => {
    const grouped: Record<BabyLogType, BabyLog[]> = {
      feeding: [],
      pumping: [],
      sleep: [],
      solids: [],
      diaper: [],
      handoff: [],
    };
    for (const log of selectedLogs) {
      grouped[log.log_type].push(log);
    }
    return grouped;
  }, [selectedLogs]);

  const headerLabel = useMemo(() => {
    if (viewMode === 'day') {
      return selectedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
      });
    }

    if (viewMode === 'week') {
      const start = startOfWeek(selectedDate);
      const end = addDays(start, 6);
      return `${toDisplayDate(start)} - ${toDisplayDate(end)}`;
    }

    return anchorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [viewMode, selectedDate, anchorDate]);

  function jumpPeriod(step: -1 | 1) {
    if (viewMode === 'day') {
      setSelectedDate(prev => addDays(prev, step));
      return;
    }

    if (viewMode === 'week') {
      setSelectedDate(prev => addDays(prev, step * 7));
      return;
    }

    setAnchorDate(prev => new Date(prev.getFullYear(), prev.getMonth() + step, 1));
  }

  function setToday() {
    const today = startOfDay(new Date());
    setSelectedDate(today);
    setAnchorDate(startOfMonth(today));
  }

  function onChangeView(next: string) {
    const normalized = next as BabyCalendarViewMode;
    setViewMode(normalized);
    if (normalized === 'month') {
      setAnchorDate(startOfMonth(selectedDate));
    }
  }

  function onChangeCategory(next: string) {
    setCategory(next as BabyCalendarCategory);
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.sectionTitle}>Baby log calendar</Text>

      <SegmentedControl
        options={VIEW_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
        value={viewMode}
        onChange={onChangeView}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTER_OPTIONS.map(option => {
          const selected = category === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterChip, selected && styles.filterChipActive]}
              onPress={() => onChangeCategory(option.value)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterLabel, selected && styles.filterLabelActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.navButton} onPress={() => jumpPeriod(-1)} activeOpacity={0.7}>
          <Text style={styles.navButtonLabel}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerLabel}>{headerLabel}</Text>
        <TouchableOpacity style={styles.navButton} onPress={() => jumpPeriod(1)} activeOpacity={0.7}>
          <Text style={styles.navButtonLabel}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={setToday} style={styles.todayBtn} activeOpacity={0.75}>
        <Text style={styles.todayBtnText}>Jump to today</Text>
      </TouchableOpacity>

      {viewMode !== 'day' && (
        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map(label => (
            <Text key={label} style={styles.weekdayLabel}>{label}</Text>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={viewMode === 'month' ? styles.monthGrid : styles.linearGrid}>
          {visibleDates.map((date) => {
            const dayKey = toDateKey(date);
            const dayLogs = logsByDay[dayKey] ?? [];
            const isSelected = dayKey === selectedKey;
            const isCurrentMonth = date.getMonth() === anchorDate.getMonth();
            const dayCategoryColors = [
              ...new Set(dayLogs.map(log => CATEGORY_COLORS[log.log_type])),
            ].slice(0, 3);

            return (
              <TouchableOpacity
                key={dayKey}
                style={[
                  styles.dateCell,
                  viewMode === 'month' ? styles.dateCellMonth : styles.dateCellLinear,
                  isSelected && styles.dateCellSelected,
                  viewMode === 'month' && !isCurrentMonth && styles.dateCellMuted,
                ]}
                onPress={() => setSelectedDate(date)}
                activeOpacity={0.75}
              >
                <Text style={[styles.dateNumber, isSelected && styles.dateNumberSelected]}>{date.getDate()}</Text>
                <View style={styles.dotsWrap}>
                  {dayCategoryColors.map((dotColor) => (
                    <View key={`${dayKey}-${dotColor}`} style={[styles.dot, { backgroundColor: dotColor }]} />
                  ))}
                  {dayLogs.length > 3 && <Text style={styles.countText}>{dayLogs.length}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Card style={styles.dayDetailCard}>
        <Text style={styles.dayDetailTitle}>
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {selectedLogs.length === 0 ? (
          <Text style={styles.emptyText}>No logs in this range for the selected filters.</Text>
        ) : (
          (Object.keys(selectedGroups) as BabyLogType[])
            .filter(type => selectedGroups[type].length > 0)
            .map(type => (
              <View key={type} style={styles.groupBlock}>
                <Text style={styles.groupTitle}>{titleCase(type)}</Text>
                {selectedGroups[type].map((entry, index) => (
                  <View key={entry.id} style={[styles.entryRow, index < selectedGroups[type].length - 1 && styles.entryBorder]}>
                    <Text style={styles.entryTime}>
                      {new Date(entry.logged_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    {!!formatSummary(entry) && <Text style={styles.entrySummary}>{formatSummary(entry)}</Text>}
                    {!!entry.notes && <Text style={styles.entryNotes}>{entry.notes}</Text>}
                  </View>
                ))}
              </View>
            ))
        )}
      </Card>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.heading.semibold,
    fontSize: 17,
  },
  filterRow: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  filterChip: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterLabel: {
    color: colors.primary,
    fontFamily: fonts.body.medium,
    fontSize: 12,
  },
  filterLabelActive: {
    color: colors.surface,
    fontFamily: fonts.body.semibold,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  navButtonLabel: {
    color: colors.primary,
    fontFamily: fonts.body.semibold,
    fontSize: 18,
    lineHeight: 20,
  },
  headerLabel: {
    color: colors.text,
    fontFamily: fonts.body.semibold,
    fontSize: 14,
  },
  todayBtn: {
    alignSelf: 'flex-start',
  },
  todayBtnText: {
    color: colors.primary,
    fontFamily: fonts.body.medium,
    fontSize: 12,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    color: colors.textMuted,
    flex: 1,
    fontFamily: fonts.body.medium,
    fontSize: 11,
    textAlign: 'center',
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  linearGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  dateCell: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'space-between',
    minHeight: 58,
    paddingVertical: spacing.xs,
  },
  dateCellMonth: {
    width: '13.4%',
  },
  dateCellLinear: {
    flex: 1,
  },
  dateCellSelected: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primary,
  },
  dateCellMuted: {
    opacity: 0.45,
  },
  dateNumber: {
    color: colors.text,
    fontFamily: fonts.body.semibold,
    fontSize: 13,
  },
  dateNumberSelected: {
    color: colors.primary,
  },
  dotsWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    minHeight: 14,
  },
  dot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  countText: {
    color: colors.textMuted,
    fontFamily: fonts.body.medium,
    fontSize: 10,
    marginLeft: 2,
  },
  dayDetailCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.xs,
    shadowOpacity: 0,
  },
  dayDetailTitle: {
    color: colors.text,
    fontFamily: fonts.heading.semibold,
    fontSize: 16,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: fonts.body.regular,
    fontSize: 13,
  },
  groupBlock: {
    gap: 6,
    marginTop: spacing.xs,
  },
  groupTitle: {
    color: colors.primary,
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  entryRow: {
    gap: 2,
    paddingVertical: spacing.xs,
  },
  entryBorder: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  entryTime: {
    color: colors.text,
    fontFamily: fonts.body.semibold,
    fontSize: 12,
  },
  entrySummary: {
    color: colors.text,
    fontFamily: fonts.body.regular,
    fontSize: 12,
  },
  entryNotes: {
    color: colors.textMuted,
    fontFamily: fonts.body.regular,
    fontSize: 12,
  },
});
