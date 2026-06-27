# Supabase Setup

This repo uses `supabase-schema.sql` as the destructive full-bootstrap source of
truth for Blueberry's current Phase 1 data model. Run it only against the
Supabase project intended for manual UAT or local operator verification.

Use this document for environment bootstrap. Use
`docs/supabase-golden-path.md` for the expected runtime behavior, and
`docs/phase1-golden-path-uat.md` for the manual UAT sequence.

## Current scope

Included in the consolidated schema:

- Auth-backed household model: `households`, `users`
- Shared Phase 1 data: `health_logs`, `appointments`, `todos`,
  `journal_entries`, `baby_logs`
- Single-user logging tools: `kick_sessions`, `contraction_sessions`
- Push-preference storage: `device_push_tokens`, `notification_preferences`

Not included in the live-ready golden path:

- Scheduled server-side reminder delivery
- APNs Edge Function verification
- Apple-portal-dependent push deployment steps

Apple Developer approval is still pending. Treat APNs delivery as blocked for
manual verification in this phase.

## Schema deploy

1. Open the target Supabase project dashboard.
2. Go to `SQL Editor` and create a new query.
3. Paste the full contents of `supabase-schema.sql`.
4. Run the query once.

Important behavior:

- The script is destructive for Blueberry-owned tables.
- Re-running it drops existing Blueberry tables, policies, indexes, triggers,
  and publication membership before recreating them.
- `auth.users` is not dropped, so Auth identities remain unless you remove them
  separately in the Supabase dashboard.

## Post-schema checks

After running `supabase-schema.sql`, confirm the following in Supabase:

### Tables

Expected tables:

- `households`
- `users`
- `device_push_tokens`
- `notification_preferences`
- `health_logs`
- `appointments`
- `todos`
- `journal_entries`
- `baby_logs`
- `kick_sessions`
- `contraction_sessions`

### RLS

Row Level Security should be enabled on all tables above.

Key policy assumptions the app depends on:

- `users.id` must match `auth.users.id`
- Only one `mother` and one `partner` are allowed per household
- A household cannot exceed two members
- Shared data tables are household-scoped through `get_my_household_id()`
- Joining a household depends on `join_household_by_code(code)`
- Creating a household depends on `create_household(p_role, p_invite_code)`
- Push tokens and notification preferences are user-scoped, not
  household-scoped

### Realtime

The app only expects Realtime on these five tables:

- `todos`
- `health_logs`
- `journal_entries`
- `appointments`
- `baby_logs`

This is intentional. Do not expect Realtime behavior for:

- `households`
- `users`
- `device_push_tokens`
- `notification_preferences`
- `kick_sessions`
- `contraction_sessions`

In Supabase UI, verify the `supabase_realtime` publication includes those five
tables. The schema adds them directly, but checking the publication in the
dashboard reduces ambiguity before UAT.

## Environment

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Required for the app to talk to Supabase:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
```

Optional for Google Calendar work only:

```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-ios-client-id
```

Notes:

- Expo only exposes variables prefixed with `EXPO_PUBLIC_`.
- Supabase's current client-safe key may be shown in the dashboard as a
  publishable key (`sb_publishable_*`). Put that value in
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Never put a Supabase secret or service-role key in the mobile app.

## Auth assumptions to verify before UAT

Blueberry's auth flow is not "email account only"; Phase 1 requires the related
`users` row and household membership to exist before the main app is considered
ready.

Expected auth path:

1. User signs up or signs in with Supabase Auth.
2. New user chooses role: `mother` or `partner`.
3. New user either:
   - creates a household through `create_household(...)`, or
   - joins through `join_household_by_code(...)`
4. The app reads back the `users` row and household row.
5. Only then does the auth gate route the user into the main tabs.

If Auth succeeds but `users` or `households` bootstrap is missing, the user can
remain stuck in the auth flow. That is a schema/setup issue, not a successful
golden-path pass.

## Local operator checks

Run the local checker after `.env.local` is in place:

```bash
npm run push:readiness
```

If you want the checker to also report on the remote function deployment inputs,
export these before running it:

```bash
APNS_TEAM_ID=your-apple-team-id
APNS_KEY_ID=your-apns-key-id
APNS_BUNDLE_ID=com.dbeveridge.blueberry
APNS_ENV=sandbox
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
PUSH_FUNCTION_SECRET=long-random-shared-secret
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Despite the script name, it now validates the broader Supabase golden-path
operator prerequisites in this repo. It does not contact Supabase and does not
prove that a live project is configured correctly.

## APNs status

Push-related repo assets exist, but live APNs verification is still blocked for
this phase.

Blocked until Apple Developer approval:

- final Apple-side APNs key provisioning
- live Edge Function secret setup validation
- end-to-end push delivery on a real iPhone through the approved Apple account

What is still useful now:

- verify `device_push_tokens` and `notification_preferences` schema presence
- verify notification UI assumptions during manual app testing
- verify local reminder scheduling behavior on iPhone if a build is available

## Event Dispatch Function (Scaffold)

Blueberry now includes `supabase/functions/dispatch-event-notification/index.ts` as
safe scaffolding for event-driven notifications.

What it does now:

- Validates incoming event payloads (`appointment_reminder`, `partner_check_in`, `new_todo`)
- Resolves household recipients from `users`
- Filters recipients by `notification_preferences`
- Uses `device_push_tokens` for per-user token/environment targeting
- Calls `send-apns-notification` for each eligible recipient
- Supports `testMode: true` to verify recipient selection without sending APNs traffic

What is intentionally not wired yet:

- Database webhooks / triggers calling this function automatically
- Cron scheduling for reminder windows

## Re-running

Re-running drops all Blueberry tables (cascading away policies, FKs, indexes,
and realtime publication membership) and recreates them clean. Any test data
in those tables is lost. `auth.users` is untouched; Supabase Auth identities
survive a schema re-run.

## Push 7c Quick Verification

Use this sequence for the Phase 7c deployment gate.

1. Deploy or confirm `supabase-schema.sql` and `supabase/migrations/20260620100000_create_device_push_tokens.sql` in the active project.
2. Set function secrets in Supabase project settings:
   - `APNS_PRIVATE_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_ENV`
   - `PUSH_FUNCTION_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy Edge Functions:
   - `supabase functions deploy send-apns-notification`
   - `supabase functions deploy dispatch-event-notification`
4. Run readiness check locally: `npm run push:readiness`.
5. Validate on a real iPhone:
   - Open Blueberry, go to More -> Notifications.
   - Register or refresh token.
   - Send a test notification through `send-apns-notification`.
   - Optionally validate recipient routing via `dispatch-event-notification` with `testMode: true` first.
   - Confirm delivery on device.
