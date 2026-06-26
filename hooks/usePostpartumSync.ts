import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRealtimeSync } from './useRealtimeSync';
import { supabase } from '../lib/supabase';
import type {
  BabyLog,
  HealthLog,
  HouseholdEvent,
  NightShiftStatus,
  PostpartumBleedingLevel,
  PostpartumCheckIn,
  PostpartumCheckInEntry,
  PostpartumRecoveryStatus,
  PostpartumSleepQuality,
  PostpartumStats,
} from '../types';

export const POSTPARTUM_CHECKIN_PREFIX = '[postpartum-checkin]';

function startOfToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isNightShiftEvent(event: HouseholdEvent): boolean {
  return event.event_type === 'night_shift_swap';
}

export function serializePostpartumCheckIn(input: PostpartumCheckIn): string {
  return `${POSTPARTUM_CHECKIN_PREFIX}${JSON.stringify(input)}`;
}

export function parsePostpartumCheckIn(log: HealthLog): PostpartumCheckInEntry | null {
  if (!log.notes?.startsWith(POSTPARTUM_CHECKIN_PREFIX)) return null;

  const payload = log.notes.slice(POSTPARTUM_CHECKIN_PREFIX.length);
  try {
    const parsed = JSON.parse(payload) as PostpartumCheckIn;
    return {
      id: log.id,
      logged_at: log.logged_at,
      recoveryStatus: parsed.recoveryStatus,
      bleeding: parsed.bleeding,
      sleepQuality: parsed.sleepQuality,
      energyLevel: parsed.energyLevel,
      notes: parsed.notes,
    };
  } catch {
    return null;
  }
}

function sumDiapers(logs: BabyLog[]): number {
  return logs.reduce((total, log) => {
    if (log.log_type !== 'diaper') return total;
    const count = log.details?.count;
    return total + (typeof count === 'number' ? count : 1);
  }, 0);
}

function sumSleepMinutes(logs: BabyLog[]): number {
  return logs.reduce((total, log) => {
    if (log.log_type !== 'sleep') return total;
    const duration = log.details?.durationMins;
    return total + (typeof duration === 'number' ? duration : 0);
  }, 0);
}

function findLatest(logs: BabyLog[], type: BabyLog['log_type']): string | null {
  const match = logs.find((log) => log.log_type === type);
  return match?.logged_at ?? null;
}

function emptyStats(): PostpartumStats {
  return {
    feedingsToday: 0,
    diapersToday: 0,
    sleepMinutesToday: 0,
    pumpingSessionsToday: 0,
    latestFeedingAt: null,
    latestSleepAt: null,
  };
}

export function getRecoveryStatusLabel(status: PostpartumRecoveryStatus): string {
  switch (status) {
    case 'steady':
      return 'Steady';
    case 'tender':
      return 'Tender';
    case 'drained':
      return 'Drained';
    case 'overwhelmed':
      return 'Overwhelmed';
  }
}

export function getBleedingLabel(level: PostpartumBleedingLevel): string {
  switch (level) {
    case 'lighter':
      return 'Lighter';
    case 'same':
      return 'About the same';
    case 'heavier':
      return 'Heavier';
  }
}

export function getSleepQualityLabel(quality: PostpartumSleepQuality): string {
  switch (quality) {
    case 'broken':
      return 'Broken sleep';
    case 'patchy':
      return 'Patchy sleep';
    case 'okay':
      return 'Okay sleep';
  }
}

export function getNightShiftStatusLabel(status: NightShiftStatus): string {
  switch (status) {
    case 'starting':
      return 'On shift';
    case 'ending':
      return 'Shift ending';
    case 'need-help':
      return 'Needs backup';
  }
}

export function usePostpartumSync(householdId: string | null) {
  const [logs, setLogs] = useState<BabyLog[]>([]);
  const [events, setEvents] = useState<HouseholdEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!householdId) {
      setLogs([]);
      setEvents([]);
      return;
    }

    setLoading(true);
    try {
      const logsResult = await supabase
        .from('baby_logs')
        .select('id, household_id, user_id, log_type, logged_at, details, notes, created_at')
        .eq('household_id', householdId)
        .order('logged_at', { ascending: false })
        .limit(40);

      setLogs((logsResult.data ?? []) as unknown as BabyLog[]);
    } catch {
      setLogs([]);
    }

    try {
      const eventsResult = await supabase
        .from('household_events')
        .select('id, household_id, actor_id, event_type, payload, created_at')
        .eq('household_id', householdId)
        .eq('event_type', 'night_shift_swap')
        .order('created_at', { ascending: false })
        .limit(8);

      setEvents((eventsResult.data ?? []) as unknown as HouseholdEvent[]);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  useRealtimeSync<Record<string, unknown>>({
    table: 'baby_logs',
    householdId,
    onInsert: (payload) => {
      const log = payload as unknown as BabyLog;
      setLogs((prev) => [log, ...prev.filter((item) => item.id !== log.id)].slice(0, 40));
    },
  });

  useRealtimeSync<Record<string, unknown>>({
    table: 'household_events',
    householdId,
    onInsert: (payload) => {
      const event = payload as unknown as HouseholdEvent;
      if (!isNightShiftEvent(event)) return;
      setEvents((prev) => [event, ...prev.filter((item) => item.id !== event.id)].slice(0, 8));
    },
  });

  const stats = useMemo(() => {
    if (!logs.length) return emptyStats();

    const todayStart = startOfToday(new Date()).getTime();
    const todaysLogs = logs.filter((log) => new Date(log.logged_at).getTime() >= todayStart);
    const feedingLogs = todaysLogs.filter((log) => log.log_type === 'feeding');
    const pumpingLogs = todaysLogs.filter((log) => log.log_type === 'pumping');

    return {
      feedingsToday: feedingLogs.length,
      diapersToday: sumDiapers(todaysLogs),
      sleepMinutesToday: sumSleepMinutes(todaysLogs),
      pumpingSessionsToday: pumpingLogs.length,
      latestFeedingAt: findLatest(logs, 'feeding'),
      latestSleepAt: findLatest(logs, 'sleep'),
    };
  }, [logs]);

  return {
    loading,
    logs,
    recentLogs: logs.slice(0, 5),
    stats,
    latestNightShiftEvent: events[0] ?? null,
    nightShiftEvents: events,
    refresh,
  };
}
