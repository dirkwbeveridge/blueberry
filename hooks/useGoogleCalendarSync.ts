import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getValidAccessToken } from '../lib/googleAuth';
import { createCalendarEvent, getCalendarEvent, listCalendarEvents, updateCalendarEvent } from '../lib/googleCalendarApi';
import {
    loadGoogleCalendarSyncMetadata,
    setGoogleCalendarLastSyncedAt,
    type GoogleCalendarConflictPolicy,
} from '../lib/googleCalendarSyncPrefs';
import { cancelAppointmentReminderByAppointmentId } from '../lib/notifications';
import { supabase } from '../lib/supabase';
import type { Appointment } from '../types';

const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;

interface GoogleSyncResult {
  created: number;
  updated: number;
  deleted: number;
  pushed: number;
  conflictPolicy: GoogleCalendarConflictPolicy;
  syncedAt: string | null;
  skipped: boolean;
  reason?: string;
}

function appointmentEndIso(startIso: string): string {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return end.toISOString();
}

function localTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function normalizeIso(value: string): string {
  return new Date(value).toISOString();
}

function getValidTimestamp(value: string): number | null {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getGoogleEventStartIso(event: { start: { dateTime?: string; date?: string } }): string | null {
  if (event.start.dateTime) {
    const parsed = new Date(event.start.dateTime);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (event.start.date) {
    const parsed = new Date(`${event.start.date}T09:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return null;
}

function buildGoogleEventFromAppointment(appointment: Pick<Appointment, 'title' | 'appointment_date' | 'location'>) {
  const startIso = normalizeIso(appointment.appointment_date);
  const timezone = localTimezone();

  return {
    summary: appointment.title,
    start: {
      dateTime: startIso,
      timeZone: timezone,
    },
    end: {
      dateTime: appointmentEndIso(startIso),
      timeZone: timezone,
    },
    location: appointment.location ?? undefined,
  };
}

function buildGoogleSyncWindow(appointments: Appointment[]): { timeMin: string; timeMax: string } {
  const linkedAppointmentTimestamps = appointments
    .filter((appointment) => Boolean(appointment.google_event_id))
    .map((appointment) => getValidTimestamp(appointment.appointment_date))
    .filter((timestamp): timestamp is number => timestamp !== null);

  const fallbackNow = Date.now();
  const minLinkedTs = linkedAppointmentTimestamps.length > 0
    ? Math.min(...linkedAppointmentTimestamps)
    : fallbackNow - 30 * 24 * 60 * 60 * 1000;
  const maxLinkedTs = linkedAppointmentTimestamps.length > 0
    ? Math.max(...linkedAppointmentTimestamps)
    : fallbackNow + 365 * 24 * 60 * 60 * 1000;

  return {
    timeMin: new Date(minLinkedTs - 30 * 24 * 60 * 60 * 1000).toISOString(),
    timeMax: new Date(maxLinkedTs + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

async function findLinkedGoogleEvent(
  accessToken: string,
  googleEventId: string,
  eventsById: Map<string, Awaited<ReturnType<typeof listCalendarEvents>>[number]>,
) {
  const listedEvent = eventsById.get(googleEventId);
  if (listedEvent) {
    return listedEvent;
  }

  return getCalendarEvent(accessToken, googleEventId);
}

export async function syncGoogleCalendarForUserHousehold(
  userId: string,
  householdId: string,
): Promise<GoogleSyncResult> {
  const syncMetadata = await loadGoogleCalendarSyncMetadata(userId);
  const conflictPolicy = syncMetadata.conflictPolicy;

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return {
      created: 0,
      updated: 0,
      deleted: 0,
      pushed: 0,
      conflictPolicy,
      syncedAt: syncMetadata.lastSyncedAt,
      skipped: true,
      reason: 'no_token',
    };
  }

  const { data: rows, error } = await supabase
    .from('appointments')
    .select('id, title, appointment_date, location, google_event_id')
    .eq('household_id', householdId);

  if (error) {
    throw error;
  }

  const appointments = (rows ?? []) as unknown as Appointment[];
  const { timeMin, timeMax } = buildGoogleSyncWindow(appointments);
  const events = await listCalendarEvents(accessToken, timeMin, timeMax);
  const eventsById = new Map(events.filter((event) => event.id).map((event) => [event.id as string, event]));

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let pushed = 0;

  for (const appointment of appointments) {
    if (!getValidTimestamp(appointment.appointment_date)) {
      console.warn('Google Calendar sync skipped appointment with invalid date', appointment.id);
      continue;
    }

    if (!appointment.google_event_id) {
      try {
        const eventId = await createCalendarEvent(accessToken, buildGoogleEventFromAppointment(appointment));
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ google_event_id: eventId })
          .eq('id', appointment.id)
          .eq('household_id', householdId);
        if (!updateError) {
          created += 1;
        }
      } catch (syncError) {
        console.warn('Google Calendar create sync skipped', syncError);
      }
      continue;
    }

    const linkedEvent = await findLinkedGoogleEvent(accessToken, appointment.google_event_id, eventsById);
    if (!linkedEvent || linkedEvent.status === 'cancelled') {
      if (conflictPolicy === 'blueberry_wins') {
        try {
          const eventId = await createCalendarEvent(accessToken, buildGoogleEventFromAppointment(appointment));
          const { error: updateError } = await supabase
            .from('appointments')
            .update({ google_event_id: eventId })
            .eq('id', appointment.id)
            .eq('household_id', householdId);
          if (!updateError) {
            created += 1;
          }
        } catch (resyncError) {
          console.warn('Google Calendar re-create sync skipped', resyncError);
        }
      } else {
        const { error: deleteError } = await supabase
          .from('appointments')
          .delete()
          .eq('id', appointment.id)
          .eq('household_id', householdId);
        if (!deleteError) {
          await cancelAppointmentReminderByAppointmentId(appointment.id);
          deleted += 1;
        }
      }
      continue;
    }

    const googleTitle = linkedEvent.summary;
    const googleDateIso = getGoogleEventStartIso(linkedEvent);
    if (!googleDateIso) {
      continue;
    }
    const googleLocation = linkedEvent.location ?? null;

    const titleChanged = googleTitle !== appointment.title;
    const dateChanged = googleDateIso !== normalizeIso(appointment.appointment_date);
    const locationChanged = googleLocation !== (appointment.location ?? null);

    if (!titleChanged && !dateChanged && !locationChanged) {
      continue;
    }

    if (conflictPolicy === 'blueberry_wins') {
      try {
        await updateCalendarEvent(accessToken, appointment.google_event_id, buildGoogleEventFromAppointment(appointment));
        pushed += 1;
      } catch (pushError) {
        console.warn('Google Calendar push sync skipped', pushError);
      }
    } else {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          title: googleTitle,
          appointment_date: googleDateIso,
          location: googleLocation,
        })
        .eq('id', appointment.id)
        .eq('household_id', householdId);

      if (!updateError) {
        updated += 1;
      }
    }
  }

  const syncedAt = new Date().toISOString();
  await setGoogleCalendarLastSyncedAt(userId, syncedAt);

  return {
    created,
    updated,
    deleted,
    pushed,
    conflictPolicy,
    syncedAt,
    skipped: false,
  };
}

export function useGoogleCalendarSync(userId: string | null, householdId: string | null) {
  const lastSyncRef = useRef(0);
  const syncingRef = useRef(false);

  const runSync = useCallback(async (force: boolean) => {
    if (!userId || !householdId) {
      return;
    }

    if (syncingRef.current) {
      return;
    }

    const now = Date.now();
    if (!force && now - lastSyncRef.current < MIN_SYNC_INTERVAL_MS) {
      return;
    }

    syncingRef.current = true;
    try {
      await syncGoogleCalendarForUserHousehold(userId, householdId);
      lastSyncRef.current = Date.now();
    } catch (error) {
      console.warn('Google Calendar foreground sync failed', error);
    } finally {
      syncingRef.current = false;
    }
  }, [householdId, userId]);

  useEffect(() => {
    void runSync(true);
  }, [runSync]);

  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === 'active') {
        void runSync(false);
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [runSync]);

  return {
    syncNow: async () => runSync(true),
  };
}
