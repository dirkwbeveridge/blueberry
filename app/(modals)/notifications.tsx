import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { TimeField } from '../../components/ui/TimeField';
import { colors, fonts, spacing } from '../../constants/theme';
import { useHousehold } from '../../hooks/useHousehold';
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    formatNotificationTime,
    getNativePushPermissionState,
    getNotificationPreferencesForUser,
    getStoredNativePushTokenForUser,
    openSystemNotificationSettings,
    parseNotificationTime,
    resyncLocalAppointmentRemindersForUser,
    saveNotificationPreferencesForUser,
    syncNativePushTokenForUser,
    type NativePushPermissionState,
    type NotificationPreferencesInput,
    type StoredNativePushToken,
} from '../../lib/notifications';

type PreferenceKey = keyof NotificationPreferencesInput;

function permissionBadge(permission: NativePushPermissionState | null) {
  if (!permission) return { label: 'Loading', variant: 'default' as const };
  if (permission.granted) return { label: 'Enabled', variant: 'success' as const };
  if (permission.canAskAgain) return { label: 'Ask again', variant: 'warning' as const };
  return { label: 'Disabled', variant: 'error' as const };
}

function tokenBadge(token: StoredNativePushToken | null) {
  if (!token) return { label: 'Not synced', variant: 'default' as const };
  return { label: token.environment, variant: 'accent' as const };
}

function preferenceSummary(preferences: NotificationPreferencesInput) {
  const enabledCount = [
    preferences.appointment_reminders,
    preferences.partner_check_ins,
    preferences.new_todos,
    preferences.kick_reminder,
  ].filter(Boolean).length;

  return `${enabledCount}/4 categories enabled`;
}

function ToggleRow({
  label,
  sub,
  value,
  onValueChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primaryTint }}
        thumbColor={value ? colors.primary : '#f4f3f4'}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

export default function NotificationsModal() {
  const { currentUser, household } = useHousehold();
  const [permission, setPermission] = useState<NativePushPermissionState | null>(null);
  const [storedToken, setStoredToken] = useState<StoredNativePushToken | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferencesInput>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const permissionInfo = useMemo(() => permissionBadge(permission), [permission]);
  const tokenInfo = useMemo(() => tokenBadge(storedToken), [storedToken]);
  const preferenceInfo = useMemo(() => preferenceSummary(preferences), [preferences]);

  const refreshState = useCallback(async () => {
    if (!currentUser?.id) {
      setPermission(null);
      setStoredToken(null);
      setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [permissionState, tokenState, preferencesState] = await Promise.all([
        getNativePushPermissionState(),
        getStoredNativePushTokenForUser(currentUser.id),
        getNotificationPreferencesForUser(currentUser.id),
      ]);

      setPermission(permissionState);
      setStoredToken(tokenState);
      setPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...preferencesState });
    } catch (error) {
      Alert.alert('Could not load notifications', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshState();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshState]);

  async function handleSync() {
    if (!currentUser?.id) {
      Alert.alert('Missing user', 'Sign in again and try once more.');
      return;
    }

    setSyncing(true);
    try {
      await syncNativePushTokenForUser(currentUser.id);
      await refreshState();
      Alert.alert('Notifications ready', 'This iPhone is now registered for APNs delivery.');
    } catch (error) {
      Alert.alert('Could not sync', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleOpenSettings() {
    try {
      await openSystemNotificationSettings();
    } catch (error) {
      Alert.alert('Could not open settings', error instanceof Error ? error.message : 'Try again.');
    }
  }

  function updatePreference<K extends PreferenceKey>(key: K, value: NotificationPreferencesInput[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  async function handleSavePreferences() {
    if (!currentUser?.id) {
      Alert.alert('Missing user', 'Sign in again and try once more.');
      return;
    }

    setSavingPreferences(true);
    try {
      const saved = await saveNotificationPreferencesForUser(currentUser.id, preferences);
      if (household?.id) {
        await resyncLocalAppointmentRemindersForUser(currentUser.id, household.id);
      }
      setPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...saved });
      Alert.alert('Preferences saved', 'Notification categories and quiet hours were updated.');
    } catch (error) {
      Alert.alert('Could not save preferences', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSavingPreferences(false);
    }
  }

  const permissionSummary = permission
    ? permission.granted
      ? 'Blueberry can show alerts, badges, and sounds on this iPhone.'
      : permission.canAskAgain
        ? 'Blueberry can request permission again from this screen.'
        : 'Notifications are blocked in iPhone Settings.'
    : 'Checking notification permission on this device.';

  const quietFrom = parseNotificationTime(preferences.quiet_from);
  const quietUntil = parseNotificationTime(preferences.quiet_until);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="Notifications"
        subtitle="Native APNs setup for the current iPhone. No Expo push service."
        action={<Button label="Done" variant="ghost" onPress={() => router.back()} />}
      />

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Permission</Text>
          <Badge label={permissionInfo.label} variant={permissionInfo.variant} />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Device token</Text>
          <Badge label={tokenInfo.label} variant={tokenInfo.variant} />
        </View>
        {storedToken ? (
          <>
            <Text style={styles.detail}>Bundle ID: {storedToken.bundle_id}</Text>
            <Text style={styles.detail}>Token updated: {new Date(storedToken.updated_at).toLocaleString()}</Text>
          </>
        ) : (
          <Text style={styles.detail}>This device has not been registered yet.</Text>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>What happens</Text>
        <Text style={styles.body}>{permissionSummary}</Text>
        <Text style={styles.body}>
          When you tap refresh, Blueberry asks for notification permission if needed, reads the native APNs token, and stores it in Supabase for this user.
        </Text>
      </Card>

      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>What to send you</Text>
          <Badge label={preferenceInfo} variant="accent" />
        </View>
        <ToggleRow
          label="Appointment reminders"
          sub="24 hours before, with title and time only"
          value={preferences.appointment_reminders}
          onValueChange={(value) => updatePreference('appointment_reminders', value)}
        />
        <ToggleRow
          label="Partner check-ins"
          sub="When they share one"
          value={preferences.partner_check_ins}
          onValueChange={(value) => updatePreference('partner_check_ins', value)}
        />
        <ToggleRow
          label="New to-dos"
          sub="When your partner adds one"
          value={preferences.new_todos}
          onValueChange={(value) => updatePreference('new_todos', value)}
        />
        <ToggleRow
          label="Kick reminder"
          sub="Daily prompt, off until the kick-count window"
          value={preferences.kick_reminder}
          onValueChange={(value) => updatePreference('kick_reminder', value)}
        />
      </Card>

      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quiet hours</Text>
          <Switch
            value={preferences.quiet_hours_enabled}
            onValueChange={(value) => updatePreference('quiet_hours_enabled', value)}
            trackColor={{ false: colors.border, true: colors.primaryTint }}
            thumbColor={preferences.quiet_hours_enabled ? colors.primary : '#f4f3f4'}
            ios_backgroundColor={colors.border}
          />
        </View>
        <TimeField
          label="Quiet from"
          value={quietFrom}
          onChange={(value) => updatePreference('quiet_from', value ? formatNotificationTime(value) : DEFAULT_NOTIFICATION_PREFERENCES.quiet_from)}
          placeholder="9:00 PM"
          minuteInterval={15}
        />
        <TimeField
          label="Quiet until"
          value={quietUntil}
          onChange={(value) => updatePreference('quiet_until', value ? formatNotificationTime(value) : DEFAULT_NOTIFICATION_PREFERENCES.quiet_until)}
          placeholder="7:00 AM"
          minuteInterval={15}
        />
        <Text style={styles.detail}>No notifications during these hours.</Text>
        <Text style={styles.detail}>Saving refreshes local appointment reminders on this iPhone.</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <Text style={styles.body}>
          Health details never appear in a notification. Appointment titles and timing only.
        </Text>
      </Card>

      <View style={styles.actions}>
        <Button label={syncing ? 'Syncing…' : 'Enable or refresh'} loading={syncing} onPress={handleSync} />
        <Button
          label={savingPreferences ? 'Saving…' : 'Save preferences'}
          variant="secondary"
          loading={savingPreferences}
          onPress={handleSavePreferences}
        />
        <Button label="Open iPhone Settings" variant="secondary" onPress={handleOpenSettings} />
      </View>

      <Button label="Reload status" variant="ghost" onPress={refreshState} disabled={loading || syncing || savingPreferences} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  card: {
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.textMuted,
    fontFamily: fonts.body.semibold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: colors.text,
    fontFamily: fonts.body.semibold,
    fontSize: 15,
  },
  detail: {
    color: colors.textMuted,
    fontFamily: fonts.body.regular,
    fontSize: 12,
  },
  body: {
    color: colors.text,
    fontFamily: fonts.body.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  toggleRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  toggleText: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.md,
  },
  toggleLabel: {
    color: colors.text,
    fontFamily: fonts.body.semibold,
    fontSize: 15,
  },
  toggleSub: {
    color: colors.textMuted,
    fontFamily: fonts.body.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    gap: spacing.sm,
  },
});
