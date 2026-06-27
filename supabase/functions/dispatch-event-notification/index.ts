import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

type SupportedEventType = 'appointment_reminder' | 'partner_check_in' | 'new_todo';

type DispatchRequest = {
  eventType: SupportedEventType;
  householdId: string;
  actorUserId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  testMode?: boolean;
};

type DevicePushTokenRow = {
  user_id: string;
  token: string;
  bundle_id: string;
  environment: 'sandbox' | 'production';
};

type NotificationPreferencesRow = {
  user_id: string;
  appointment_reminders: boolean;
  partner_check_ins: boolean;
  new_todos: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertAuthorized(request: Request) {
  const configuredSecret = Deno.env.get('PUSH_FUNCTION_SECRET');
  if (!configuredSecret || configuredSecret.trim().length === 0) {
    throw new Error('Missing PUSH_FUNCTION_SECRET');
  }

  const providedSecret = request.headers.get('x-push-function-secret');
  if (!providedSecret || providedSecret !== configuredSecret) {
    throw new Error('Unauthorized');
  }
}

function parseDispatchRequest(value: unknown): DispatchRequest {
  if (!isPlainObject(value)) {
    throw new Error('Request body must be a JSON object');
  }

  const { eventType, householdId, actorUserId, title, body, data, testMode } = value;

  if (
    eventType !== 'appointment_reminder' &&
    eventType !== 'partner_check_in' &&
    eventType !== 'new_todo'
  ) {
    throw new Error("eventType must be one of: 'appointment_reminder', 'partner_check_in', 'new_todo'");
  }

  if (typeof householdId !== 'string' || householdId.trim().length === 0) {
    throw new Error('householdId is required');
  }

  if (actorUserId !== undefined && (typeof actorUserId !== 'string' || actorUserId.trim().length === 0)) {
    throw new Error('actorUserId must be a non-empty string when provided');
  }

  if (typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('title is required');
  }

  if (typeof body !== 'string' || body.trim().length === 0) {
    throw new Error('body is required');
  }

  if (data !== undefined && !isPlainObject(data)) {
    throw new Error('data must be a JSON object when provided');
  }

  if (testMode !== undefined && typeof testMode !== 'boolean') {
    throw new Error('testMode must be a boolean when provided');
  }

  return {
    eventType,
    householdId: householdId.trim(),
    actorUserId: actorUserId?.trim(),
    title: title.trim(),
    body: body.trim(),
    data,
    testMode,
  };
}

function preferenceEnabledForEvent(
  eventType: SupportedEventType,
  preference: NotificationPreferencesRow | undefined
) {
  if (!preference) {
    return true;
  }

  if (eventType === 'appointment_reminder') {
    return preference.appointment_reminders;
  }

  if (eventType === 'partner_check_in') {
    return preference.partner_check_ins;
  }

  return preference.new_todos;
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    assertAuthorized(request);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json({ error: 'Missing Supabase service credentials' }, { status: 500 });
    }

    const payload = parseDispatchRequest(await request.json());
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const usersResult = await supabase
      .from('users')
      .select('id')
      .eq('household_id', payload.householdId);

    if (usersResult.error) {
      throw usersResult.error;
    }

    const householdUserIds = (usersResult.data ?? []).map((row) => row.id as string);
    if (householdUserIds.length === 0) {
      return Response.json({ ok: true, sent: 0, skipped: 0, reason: 'no-household-users' });
    }

    const { data: tokenRows, error: tokenError } = await supabase
      .from('device_push_tokens')
      .select('user_id, token, bundle_id, environment')
      .in('user_id', householdUserIds)
      .eq('platform', 'ios');

    if (tokenError) {
      throw tokenError;
    }

    const { data: preferenceRows, error: preferenceError } = await supabase
      .from('notification_preferences')
      .select('user_id, appointment_reminders, partner_check_ins, new_todos')
      .in('user_id', householdUserIds);

    if (preferenceError) {
      throw preferenceError;
    }

    const preferenceByUserId = new Map<string, NotificationPreferencesRow>();
    for (const row of (preferenceRows ?? []) as NotificationPreferencesRow[]) {
      preferenceByUserId.set(row.user_id, row);
    }

    const tokensByUser = new Map<string, DevicePushTokenRow>();
    for (const row of (tokenRows ?? []) as DevicePushTokenRow[]) {
      const existing = tokensByUser.get(row.user_id);
      if (!existing) {
        tokensByUser.set(row.user_id, row);
      }
    }

    const recipientTokens: DevicePushTokenRow[] = [];
    let skipped = 0;

    for (const userId of householdUserIds) {
      if (payload.actorUserId && userId === payload.actorUserId) {
        skipped += 1;
        continue;
      }

      const preference = preferenceByUserId.get(userId);
      if (!preferenceEnabledForEvent(payload.eventType, preference)) {
        skipped += 1;
        continue;
      }

      const tokenRow = tokensByUser.get(userId);
      if (!tokenRow) {
        skipped += 1;
        continue;
      }

      recipientTokens.push(tokenRow);
    }

    if (recipientTokens.length === 0) {
      return Response.json({ ok: true, sent: 0, skipped, reason: 'no-eligible-recipients' });
    }

    if (payload.testMode) {
      return Response.json({
        ok: true,
        sent: 0,
        skipped,
        testMode: true,
        recipients: recipientTokens.map((row) => ({
          userId: row.user_id,
          environment: row.environment,
          bundleId: row.bundle_id,
          tokenSuffix: row.token.slice(-8),
        })),
      });
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!anonKey) {
      return Response.json({ error: 'Missing SUPABASE_ANON_KEY' }, { status: 500 });
    }

    const functionBaseUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
    const sendResults = await Promise.all(
      recipientTokens.map(async (row) => {
        const response = await fetch(`${functionBaseUrl}/send-apns-notification`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            apikey: anonKey,
            authorization: `Bearer ${anonKey}`,
            'x-push-function-secret': Deno.env.get('PUSH_FUNCTION_SECRET') ?? '',
          },
          body: JSON.stringify({
            token: row.token,
            title: payload.title,
            body: payload.body,
            data: {
              eventType: payload.eventType,
              householdId: payload.householdId,
              actorUserId: payload.actorUserId ?? null,
              ...payload.data,
            },
            bundleId: row.bundle_id,
            environment: row.environment,
          }),
        });

        if (!response.ok) {
          return {
            userId: row.user_id,
            ok: false,
            status: response.status,
            details: await response.text(),
          };
        }

        return {
          userId: row.user_id,
          ok: true,
          status: response.status,
        };
      })
    );

    const failed = sendResults.filter((result) => !result.ok);
    return Response.json(
      {
        ok: failed.length === 0,
        sent: sendResults.length - failed.length,
        skipped,
        failed,
      },
      { status: failed.length === 0 ? 200 : 207 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid dispatch request';
    if (message === 'Unauthorized') {
      return Response.json({ error: message }, { status: 401 });
    }

    if (message === 'Missing PUSH_FUNCTION_SECRET') {
      return Response.json({ error: message }, { status: 500 });
    }

    return Response.json({ error: message }, { status: 400 });
  }
});
