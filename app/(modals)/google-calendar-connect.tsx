import * as AuthSession from 'expo-auth-session';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ModalSheet } from '../../components/ui/ModalSheet';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { colors, fonts, spacing } from '../../constants/theme';
import { syncGoogleCalendarForUserHousehold } from '../../hooks/useGoogleCalendarSync';
import { useHousehold } from '../../hooks/useHousehold';
import {
    GOOGLE_CALENDAR_SCOPES,
    clearGoogleTokens,
    exchangeGoogleAuthCode,
    loadGoogleTokens,
    saveGoogleTokens,
} from '../../lib/googleAuth';
import {
    loadGoogleCalendarSyncMetadata,
    setGoogleCalendarConflictPolicy,
    type GoogleCalendarConflictPolicy,
} from '../../lib/googleCalendarSyncPrefs';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export default function GoogleCalendarConnectModal() {
  const { currentUser, household } = useHousehold();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [conflictPolicy, setConflictPolicy] = useState<GoogleCalendarConflictPolicy>('google_wins');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const handledAuthCodeRef = useRef<string | null>(null);
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'blueberry' });

  function formatLastSynced(value: string | null): string {
    if (!value) return 'Not synced yet';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not synced yet';
    return date.toLocaleString();
  }

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      responseType: AuthSession.ResponseType.Code,
      codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
      redirectUri,
      scopes: [...GOOGLE_CALENDAR_SCOPES],
      extraParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
    discovery,
  );

  useEffect(() => {
    let active = true;

    async function refreshConnection() {
      if (!currentUser?.id) {
        if (active) setConnected(false);
        return;
      }

      const [tokens, syncMetadata] = await Promise.all([
        loadGoogleTokens(currentUser.id),
        loadGoogleCalendarSyncMetadata(currentUser.id),
      ]);

      if (active) {
        setConnected(Boolean(tokens));
        setConflictPolicy(syncMetadata.conflictPolicy);
        setLastSyncedAt(syncMetadata.lastSyncedAt);
      }
    }

    refreshConnection();
    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    async function handleAuthResponse() {
      if (response?.type !== 'success') {
        return;
      }

      if (!currentUser?.id) {
        Alert.alert('Sign in required', 'Sign in again, then retry Google Calendar connect.');
        return;
      }

      const code = response.params.code;
      const codeVerifier = request?.codeVerifier;

      if (!code || !codeVerifier) {
        Alert.alert('Connection failed', 'OAuth response was missing required values.');
        return;
      }

      if (handledAuthCodeRef.current === code) {
        return;
      }
      handledAuthCodeRef.current = code;

      setLoading(true);
      try {
        const tokens = await exchangeGoogleAuthCode({
          code,
          codeVerifier,
          redirectUri,
        });

        await saveGoogleTokens(currentUser.id, tokens);
        setConnected(true);

        if (household?.id) {
          const syncResult = await syncGoogleCalendarForUserHousehold(currentUser.id, household.id);
          setLastSyncedAt(syncResult.syncedAt);
        }

        Alert.alert('Connected', 'Google Calendar is now connected for this account.');
      } catch (error) {
        Alert.alert('Connection failed', error instanceof Error ? error.message : 'Try again.');
      } finally {
        setLoading(false);
      }
    }

    void handleAuthResponse();
  }, [currentUser?.id, household?.id, redirectUri, request?.codeVerifier, response]);

  async function handleConnect() {
    if (!currentUser?.id) {
      Alert.alert('Sign in required', 'Sign in again, then retry Google Calendar connect.');
      return;
    }

    if (!clientId) {
      Alert.alert(
        'Missing configuration',
        'Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in .env.local and restart Expo before connecting.',
      );
      return;
    }

    if (!request) {
      Alert.alert('Please retry', 'OAuth request is still preparing.');
      return;
    }

    const result = await promptAsync({
      showInRecents: true,
    });

    if (result.type === 'error') {
      Alert.alert('Connection failed', typeof result.error === 'string' ? result.error : 'Try again.');
    }
  }

  async function handleSyncNow() {
    if (!currentUser?.id || !household?.id) {
      return;
    }

    setSyncing(true);
    try {
      const result = await syncGoogleCalendarForUserHousehold(currentUser.id, household.id);
      if (result.skipped) {
        Alert.alert('Not connected', 'Connect Google Calendar first.');
      } else {
        setLastSyncedAt(result.syncedAt);
        Alert.alert(
          'Sync complete',
          `Created: ${result.created}\nUpdated from Google: ${result.updated}\nDeleted: ${result.deleted}\nPushed to Google: ${result.pushed}`,
        );
      }
      const tokens = await loadGoogleTokens(currentUser.id);
      setConnected(Boolean(tokens));
    } catch (error) {
      Alert.alert('Sync failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSyncing(false);
    }
  }

  async function handlePolicyChange(value: string) {
    if (!currentUser?.id) {
      return;
    }

    const nextPolicy: GoogleCalendarConflictPolicy = value === 'blueberry_wins' ? 'blueberry_wins' : 'google_wins';
    setConflictPolicy(nextPolicy);

    try {
      await setGoogleCalendarConflictPolicy(currentUser.id, nextPolicy);
    } catch (error) {
      Alert.alert('Could not save preference', error instanceof Error ? error.message : 'Try again.');
    }
  }

  async function handleDisconnect() {
    if (!currentUser?.id) return;

    Alert.alert('Disconnect Google Calendar?', 'You can reconnect at any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await clearGoogleTokens(currentUser.id);
            setConnected(false);
          } catch (error) {
            Alert.alert('Disconnect failed', error instanceof Error ? error.message : 'Try again.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  return (
    <ModalSheet title="Google Calendar" subtitle="Two-way appointment sync" onClose={() => router.back()}>
      <Card style={styles.card}>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Status</Text>
          <Badge label={connected ? 'Connected' : 'Not connected'} variant={connected ? 'success' : 'default'} />
        </View>
        <Text style={styles.body}>
          Blueberry uses OAuth PKCE on-device. Appointment title, date/time, and location sync to Google.
          Appointment notes stay private and never leave Blueberry.
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Planned scope</Text>
        {GOOGLE_CALENDAR_SCOPES.map((scope) => (
          <Text key={scope} style={styles.scope}>{scope}</Text>
        ))}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Conflict policy</Text>
        <SegmentedControl
          options={[
            { value: 'google_wins', label: 'Google wins' },
            { value: 'blueberry_wins', label: 'Blueberry wins' },
          ]}
          value={conflictPolicy}
          onChange={handlePolicyChange}
        />
        <Text style={styles.scope}>
          {conflictPolicy === 'google_wins'
            ? 'If both sides changed, Blueberry applies Google values on sync.'
            : 'If both sides changed, Blueberry pushes local values back to Google.'}
        </Text>
        <Text style={styles.lastSync}>Last sync: {formatLastSynced(lastSyncedAt)}</Text>
      </Card>

      {connected ? (
        <View style={styles.actions}>
          <Button label={syncing ? 'Syncing...' : 'Sync now'} loading={syncing} onPress={handleSyncNow} />
          <Button label="Disconnect" variant="secondary" loading={loading} onPress={handleDisconnect} />
        </View>
      ) : (
        <Button
          label={loading ? 'Connecting...' : 'Connect Google Calendar'}
          onPress={handleConnect}
          disabled={loading || !request}
        />
      )}

      {!clientId && (
        <Text style={styles.missingConfig}>
          Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID in .env.local.
        </Text>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.text,
    fontFamily: fonts.body.semibold,
    fontSize: 14,
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.body.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  scope: {
    color: colors.textMuted,
    fontFamily: fonts.body.regular,
    fontSize: 12,
  },
  lastSync: {
    color: colors.textMuted,
    fontFamily: fonts.body.medium,
    fontSize: 12,
  },
  actions: {
    gap: spacing.sm,
  },
  missingConfig: {
    color: colors.warning,
    fontFamily: fonts.body.regular,
    fontSize: 12,
    textAlign: 'center',
  },
});
