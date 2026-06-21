import { useCallback, useEffect, useRef } from 'react';

import { resyncLocalAppointmentRemindersForUser } from '../lib/notifications';
import { useRealtimeSync } from './useRealtimeSync';

export function useAppointmentReminderSync(userId: string | null, householdId: string | null) {
  const syncInFlight = useRef(false);
  const syncQueued = useRef(false);

  const runSync = useCallback(async () => {
    if (!userId || !householdId) {
      return;
    }

    if (syncInFlight.current) {
      syncQueued.current = true;
      return;
    }

    syncInFlight.current = true;

    try {
      do {
        syncQueued.current = false;
        await resyncLocalAppointmentRemindersForUser(userId, householdId);
      } while (syncQueued.current);
    } finally {
      syncInFlight.current = false;
    }
  }, [householdId, userId]);

  useEffect(() => {
    void runSync();
  }, [runSync]);

  useRealtimeSync<Record<string, unknown>>({
    table: 'appointments',
    householdId,
    onInsert: () => {
      void runSync();
    },
    onUpdate: () => {
      void runSync();
    },
    onDelete: () => {
      void runSync();
    },
  });
}
