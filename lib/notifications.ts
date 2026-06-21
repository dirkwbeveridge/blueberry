import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

const IOS_BUNDLE_ID = Constants.expoConfig?.ios?.bundleIdentifier ?? 'com.dbeveridge.blueberry';
const APPOINTMENT_REMINDER_STORAGE_KEY = 'blueberry-appointment-reminders';

export type NativePushTokenRegistration = {
  platform: 'ios';
  token: string;
  bundleId: string;
  environment: 'sandbox' | 'production';
};

type RegisterDeviceToken = (registration: NativePushTokenRegistration) => Promise<void>;

export type NativePushPermissionState = {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
  iosStatus?: Notifications.IosAuthorizationStatus;
};

export type StoredNativePushToken = {
  id: string;
  user_id: string;
  platform: 'ios';
  token: string;
  environment: 'sandbox' | 'production';
  bundle_id: string;
  created_at: string;
  updated_at: string;
};

export type NotificationPreferences = {
  user_id: string;
  appointment_reminders: boolean;
  partner_check_ins: boolean;
  new_todos: boolean;
  kick_reminder: boolean;
  quiet_hours_enabled: boolean;
  quiet_from: string;
  quiet_until: string;
  created_at?: string;
  updated_at?: string;
};

export type NotificationPreferencesInput = Omit<NotificationPreferences, 'user_id' | 'created_at' | 'updated_at'>;

type AppointmentReminderMap = Record<string, string>;

type AppointmentReminderTarget = {
  id: string;
  title: string;
  appointment_date: string;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesInput = {
  appointment_reminders: true,
  partner_check_ins: true,
  new_todos: true,
  kick_reminder: false,
  quiet_hours_enabled: true,
  quiet_from: '21:00:00',
  quiet_until: '07:00:00',
};

const NOTIFICATION_PREFERENCES_SELECT = [
  'user_id',
  'appointment_reminders',
  'partner_check_ins',
  'new_todos',
  'kick_reminder',
  'quiet_hours_enabled',
  'quiet_from',
  'quiet_until',
  'created_at',
  'updated_at',
].join(', ');

function buildTimeParts(value: string) {
  const [hours = '0', minutes = '0', seconds = '0'] = value.split(':');
  return {
    hours: Number(hours),
    minutes: Number(minutes),
    seconds: Number(seconds),
  };
}

function timeToMinutes(value: string) {
  const { hours, minutes } = buildTimeParts(value);
  return hours * 60 + minutes;
}

function setTimeOnDate(date: Date, value: string) {
  const { hours, minutes, seconds } = buildTimeParts(value);
  const adjusted = new Date(date);
  adjusted.setHours(hours, minutes, seconds, 0);
  return adjusted;
}

function isInQuietHours(date: Date, preferences: NotificationPreferencesInput) {
  if (!preferences.quiet_hours_enabled) {
    return false;
  }

  const quietFromMinutes = timeToMinutes(preferences.quiet_from);
  const quietUntilMinutes = timeToMinutes(preferences.quiet_until);
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  if (quietFromMinutes === quietUntilMinutes) {
    return false;
  }

  if (quietFromMinutes < quietUntilMinutes) {
    return currentMinutes >= quietFromMinutes && currentMinutes < quietUntilMinutes;
  }

  return currentMinutes >= quietFromMinutes || currentMinutes < quietUntilMinutes;
}

function adjustTriggerForQuietHours(date: Date, preferences: NotificationPreferencesInput) {
  if (!isInQuietHours(date, preferences)) {
    return date;
  }

  const quietFromMinutes = timeToMinutes(preferences.quiet_from);
  const quietUntilMinutes = timeToMinutes(preferences.quiet_until);
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  if (quietFromMinutes < quietUntilMinutes) {
    return setTimeOnDate(date, preferences.quiet_until);
  }

  if (currentMinutes >= quietFromMinutes) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return setTimeOnDate(nextDay, preferences.quiet_until);
  }

  return setTimeOnDate(date, preferences.quiet_until);
}

async function readAppointmentReminderMap(): Promise<AppointmentReminderMap> {
  const raw = await AsyncStorage.getItem(APPOINTMENT_REMINDER_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as AppointmentReminderMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeAppointmentReminderMap(value: AppointmentReminderMap) {
  await AsyncStorage.setItem(APPOINTMENT_REMINDER_STORAGE_KEY, JSON.stringify(value));
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getNativePushPermissionState(): Promise<NativePushPermissionState> {
  const permission = await Notifications.getPermissionsAsync();
  return {
    granted: permission.granted,
    canAskAgain: permission.canAskAgain,
    status: permission.status,
    iosStatus: permission.ios?.status,
  };
}

export async function openSystemNotificationSettings() {
  if (Platform.OS !== 'ios') {
    return;
  }

  await Linking.openSettings();
}

export async function syncNativePushTokenForUser(userId: string) {
  const registrationResult = await registerForNativePushNotifications(async (registration) => {
    const { error } = await supabase.from('device_push_tokens').upsert(
      {
        user_id: userId,
        platform: registration.platform,
        token: registration.token,
        environment: registration.environment,
        bundle_id: registration.bundleId,
      },
      { onConflict: 'platform,token' }
    );

    if (error) {
      throw error;
    }
  });

  return registrationResult;
}

export async function getStoredNativePushTokenForUser(userId: string) {
  const { data, error } = await supabase
    .from('device_push_tokens')
    .select('id, user_id, platform, token, environment, bundle_id, created_at, updated_at')
    .eq('user_id', userId)
    .eq('platform', 'ios')
    .eq('bundle_id', IOS_BUNDLE_ID)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as StoredNativePushToken | null;
}

export function parseNotificationTime(value: string) {
  const { hours, minutes, seconds } = buildTimeParts(value);
  const time = new Date();
  time.setHours(hours, minutes, seconds, 0);
  return time;
}

export function formatNotificationTime(value: Date) {
  const hours = value.getHours().toString().padStart(2, '0');
  const minutes = value.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}:00`;
}

function normalizeNotificationPreferences(
  preferences: Partial<NotificationPreferences> | null | undefined
): NotificationPreferences {
  return {
    user_id: preferences?.user_id ?? '',
    appointment_reminders: preferences?.appointment_reminders ?? DEFAULT_NOTIFICATION_PREFERENCES.appointment_reminders,
    partner_check_ins: preferences?.partner_check_ins ?? DEFAULT_NOTIFICATION_PREFERENCES.partner_check_ins,
    new_todos: preferences?.new_todos ?? DEFAULT_NOTIFICATION_PREFERENCES.new_todos,
    kick_reminder: preferences?.kick_reminder ?? DEFAULT_NOTIFICATION_PREFERENCES.kick_reminder,
    quiet_hours_enabled: preferences?.quiet_hours_enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.quiet_hours_enabled,
    quiet_from: preferences?.quiet_from ?? DEFAULT_NOTIFICATION_PREFERENCES.quiet_from,
    quiet_until: preferences?.quiet_until ?? DEFAULT_NOTIFICATION_PREFERENCES.quiet_until,
    created_at: preferences?.created_at,
    updated_at: preferences?.updated_at,
  };
}

export async function getNotificationPreferencesForUser(userId: string) {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select(NOTIFICATION_PREFERENCES_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeNotificationPreferences(data as Partial<NotificationPreferences> | null);
}

export async function saveNotificationPreferencesForUser(
  userId: string,
  preferences: NotificationPreferencesInput
) {
  const { error } = await supabase.from('notification_preferences').upsert(
    {
      user_id: userId,
      ...preferences,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    throw error;
  }

  return getNotificationPreferencesForUser(userId);
}

export function buildAppointmentReminderContent(appointmentTitle: string, appointmentDateIso: string) {
  const appointmentDate = new Date(appointmentDateIso);
  const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    title: 'Appointment reminder',
    body: `${appointmentTitle} at ${formattedTime}`,
  };
}

export function buildAppointmentDateTime(date: Date, time: Date | null = null) {
  const localDateTime = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time?.getHours() ?? 9,
    time?.getMinutes() ?? 0,
    0,
    0
  );

  return localDateTime.toISOString();
}

export function getAppointmentReminderTriggerDate(
  appointmentDateIso: string,
  preferences: NotificationPreferencesInput = DEFAULT_NOTIFICATION_PREFERENCES
) {
  const appointmentDate = new Date(appointmentDateIso);
  const baseTriggerDate = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);
  const triggerDate = adjustTriggerForQuietHours(baseTriggerDate, preferences);
  return triggerDate > new Date() ? triggerDate : null;
}

export async function scheduleAppointmentReminder(
  appointment: AppointmentReminderTarget,
  preferences: NotificationPreferencesInput = DEFAULT_NOTIFICATION_PREFERENCES
) {
  if (Platform.OS !== 'ios') {
    return null;
  }

  const triggerDate = getAppointmentReminderTriggerDate(appointment.appointment_date, preferences);
  if (!triggerDate) {
    await cancelAppointmentReminderByAppointmentId(appointment.id);
    return null;
  }

  await cancelAppointmentReminderByAppointmentId(appointment.id);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: buildAppointmentReminderContent(appointment.title, appointment.appointment_date),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  const reminderMap = await readAppointmentReminderMap();
  reminderMap[appointment.id] = notificationId;
  await writeAppointmentReminderMap(reminderMap);

  return notificationId;
}

export async function cancelAppointmentReminder(notificationId: string | null | undefined) {
  if (!notificationId) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAppointmentReminderByAppointmentId(appointmentId: string | null | undefined) {
  if (!appointmentId) {
    return;
  }

  const reminderMap = await readAppointmentReminderMap();
  const notificationId = reminderMap[appointmentId];

  if (!notificationId) {
    return;
  }

  await cancelAppointmentReminder(notificationId);
  delete reminderMap[appointmentId];
  await writeAppointmentReminderMap(reminderMap);
}

export async function resyncLocalAppointmentRemindersForUser(userId: string, householdId: string) {
  if (Platform.OS !== 'ios') {
    return;
  }

  const reminderMap = await readAppointmentReminderMap();
  for (const notificationId of Object.values(reminderMap)) {
    try {
      await cancelAppointmentReminder(notificationId);
    } catch {
      // Local reminder cleanup is best-effort; stale IDs should not block the refresh pass.
    }
  }
  await writeAppointmentReminderMap({});

  const preferences = await getNotificationPreferencesForUser(userId);
  if (!preferences.appointment_reminders) {
    return;
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('id, title, appointment_date')
    .eq('household_id', householdId)
    .gte('appointment_date', new Date().toISOString())
    .order('appointment_date', { ascending: true });

  if (error) {
    throw error;
  }

  for (const appointment of data ?? []) {
    await scheduleAppointmentReminder(appointment as AppointmentReminderTarget, preferences);
  }
}

export async function registerForNativePushNotifications(
  registerDeviceToken: RegisterDeviceToken,
  environment: NativePushTokenRegistration['environment'] = __DEV__ ? 'sandbox' : 'production'
) {
  if (Platform.OS !== 'ios') {
    return { status: 'unsupported-platform' as const };
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  const requestedPermission =
    existingPermission.status === 'granted'
      ? existingPermission
      : await Notifications.requestPermissionsAsync();

  const iosStatus = requestedPermission.ios?.status;
  const allowed =
    requestedPermission.granted ||
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (!allowed) {
    return { status: 'permission-denied' as const };
  }

  const deviceToken = await Notifications.getDevicePushTokenAsync();

  await registerDeviceToken({
    platform: 'ios',
    token: deviceToken.data,
    bundleId: IOS_BUNDLE_ID,
    environment,
  });

  return { status: 'registered' as const, token: deviceToken.data };
}
