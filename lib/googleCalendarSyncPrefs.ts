import AsyncStorage from '@react-native-async-storage/async-storage';

export type GoogleCalendarConflictPolicy = 'google_wins' | 'blueberry_wins';

export interface GoogleCalendarSyncMetadata {
  conflictPolicy: GoogleCalendarConflictPolicy;
  lastSyncedAt: string | null;
}

const DEFAULT_SYNC_METADATA: GoogleCalendarSyncMetadata = {
  conflictPolicy: 'google_wins',
  lastSyncedAt: null,
};

function storageKey(userId: string): string {
  return `google_calendar_sync_meta_${userId}`;
}

export async function loadGoogleCalendarSyncMetadata(userId: string): Promise<GoogleCalendarSyncMetadata> {
  if (!userId) {
    return DEFAULT_SYNC_METADATA;
  }

  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) {
    return DEFAULT_SYNC_METADATA;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GoogleCalendarSyncMetadata>;
    return {
      conflictPolicy: parsed.conflictPolicy === 'blueberry_wins' ? 'blueberry_wins' : 'google_wins',
      lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
    };
  } catch {
    return DEFAULT_SYNC_METADATA;
  }
}

async function saveGoogleCalendarSyncMetadata(userId: string, value: GoogleCalendarSyncMetadata): Promise<void> {
  if (!userId) {
    return;
  }

  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(value));
}

export async function setGoogleCalendarConflictPolicy(
  userId: string,
  conflictPolicy: GoogleCalendarConflictPolicy,
): Promise<GoogleCalendarSyncMetadata> {
  const current = await loadGoogleCalendarSyncMetadata(userId);
  const next: GoogleCalendarSyncMetadata = {
    ...current,
    conflictPolicy,
  };

  await saveGoogleCalendarSyncMetadata(userId, next);
  return next;
}

export async function setGoogleCalendarLastSyncedAt(
  userId: string,
  isoTimestamp: string,
): Promise<GoogleCalendarSyncMetadata> {
  const current = await loadGoogleCalendarSyncMetadata(userId);
  const next: GoogleCalendarSyncMetadata = {
    ...current,
    lastSyncedAt: isoTimestamp,
  };

  await saveGoogleCalendarSyncMetadata(userId, next);
  return next;
}
