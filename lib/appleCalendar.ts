import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

const APPOINTMENT_DURATION_MS = 60 * 60 * 1000;
const APPLE_CALENDAR_SOURCE_NAME = 'Blueberry';

export type AppleCalendarPermissionStatus =
  | 'undetermined'
  | 'denied'
  | 'granted'
  | 'restricted'
  | 'unavailable';

export interface AppleCalendarEventInput {
  title: string;
  startDateIso: string;
  location?: string | null;
  notes?: string | null;
}

export interface AppleCalendarListEventsInput {
  startDateIso: string;
  endDateIso: string;
  calendarId?: string | null;
}

type AppleCalendarRecord = Awaited<ReturnType<typeof Calendar.getCalendarsAsync>>[number];
type AppleCalendarEventRecord = Awaited<ReturnType<typeof Calendar.getEventsAsync>>[number];

function isIos(): boolean {
  return Platform.OS === 'ios';
}

function localTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function endDateFromStart(startDateIso: string): Date {
  return new Date(new Date(startDateIso).getTime() + APPOINTMENT_DURATION_MS);
}

export async function getAppleCalendarPermissionStatus(): Promise<AppleCalendarPermissionStatus> {
  if (!isIos()) {
    return 'unavailable';
  }

  const permissions = await Calendar.getCalendarPermissionsAsync();
  return permissions.status;
}

export async function requestAppleCalendarPermission(): Promise<AppleCalendarPermissionStatus> {
  if (!isIos()) {
    return 'unavailable';
  }

  const permissions = await Calendar.requestCalendarPermissionsAsync();
  return permissions.status;
}

export async function ensureAppleCalendarPermission(): Promise<boolean> {
  const status = await getAppleCalendarPermissionStatus();
  if (status === 'granted') {
    return true;
  }

  if (status === 'denied' || status === 'restricted' || status === 'unavailable') {
    return false;
  }

  const requested = await requestAppleCalendarPermission();
  return requested === 'granted';
}

export async function getDefaultAppleCalendarId(): Promise<string | null> {
  if (!isIos()) {
    return null;
  }

  const defaultCalendar = await Calendar.getDefaultCalendarAsync();
  if (defaultCalendar?.id) {
    return defaultCalendar.id;
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const preferred = calendars.find(
    (calendar) =>
      calendar.allowsModifications &&
      typeof calendar.source?.name === 'string' &&
      calendar.source.name.toLowerCase().includes(APPLE_CALENDAR_SOURCE_NAME.toLowerCase())
  );

  if (preferred?.id) {
    return preferred.id;
  }

  const firstWritable = calendars.find((calendar) => calendar.allowsModifications);
  return firstWritable?.id ?? null;
}

export async function listAppleCalendars(): Promise<AppleCalendarRecord[]> {
  if (!isIos()) {
    return [];
  }

  return Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
}

export async function listAppleCalendarEvents(input: AppleCalendarListEventsInput): Promise<AppleCalendarEventRecord[]> {
  if (!isIos()) {
    return [];
  }

  const hasPermission = await ensureAppleCalendarPermission();
  if (!hasPermission) {
    return [];
  }

  const fallbackCalendarId = await getDefaultAppleCalendarId();
  const calendarIds = [input.calendarId ?? fallbackCalendarId].filter(Boolean) as string[];
  if (calendarIds.length === 0) {
    return [];
  }

  return Calendar.getEventsAsync(
    calendarIds,
    new Date(input.startDateIso),
    new Date(input.endDateIso),
  );
}

export async function createAppleCalendarEvent(input: AppleCalendarEventInput): Promise<string | null> {
  if (!isIos()) {
    return null;
  }

  const hasPermission = await ensureAppleCalendarPermission();
  if (!hasPermission) {
    return null;
  }

  const calendarId = await getDefaultAppleCalendarId();
  if (!calendarId) {
    return null;
  }

  return Calendar.createEventAsync(calendarId, {
    title: input.title,
    startDate: new Date(input.startDateIso),
    endDate: endDateFromStart(input.startDateIso),
    location: input.location ?? undefined,
    notes: input.notes ?? undefined,
    timeZone: localTimezone(),
  });
}

export async function updateAppleCalendarEvent(
  eventId: string,
  input: AppleCalendarEventInput,
): Promise<boolean> {
  if (!isIos() || !eventId) {
    return false;
  }

  const hasPermission = await ensureAppleCalendarPermission();
  if (!hasPermission) {
    return false;
  }

  await Calendar.updateEventAsync(eventId, {
    title: input.title,
    startDate: new Date(input.startDateIso),
    endDate: endDateFromStart(input.startDateIso),
    location: input.location ?? undefined,
    notes: input.notes ?? undefined,
    timeZone: localTimezone(),
  });

  return true;
}

export async function deleteAppleCalendarEvent(eventId: string): Promise<boolean> {
  if (!isIos() || !eventId) {
    return false;
  }

  const hasPermission = await ensureAppleCalendarPermission();
  if (!hasPermission) {
    return false;
  }

  await Calendar.deleteEventAsync(eventId);
  return true;
}

export async function getAppleCalendarEventById(eventId: string): Promise<AppleCalendarEventRecord | null> {
  if (!isIos() || !eventId) {
    return null;
  }

  const hasPermission = await ensureAppleCalendarPermission();
  if (!hasPermission) {
    return null;
  }

  return Calendar.getEventAsync(eventId);
}
