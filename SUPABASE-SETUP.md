# Supabase Setup

One file, one run. The consolidated `supabase-schema.sql` is destructive (drops
the prior Blueberry tables before recreating) and idempotent (safe to re-run).
The `supabase/migrations/` directory currently contains only targeted follow-on
artifacts for push-token setup; the consolidated schema remains the authoritative
database definition for a full environment bootstrap.

## Steps

1. Open the Supabase project dashboard.
2. **SQL Editor → New query.**
3. Paste the full contents of `supabase-schema.sql`.
4. **Run.**
5. **Table Editor →** confirm the 9 tables exist, RLS on each:
   - `households`, `users`, `health_logs`, `appointments`, `todos`,
  `journal_entries`, `baby_logs`, `kick_sessions`, `contraction_sessions`
6. **Database → Replication → supabase_realtime →** confirm Realtime is on for
  exactly these 5 tables (the schema adds them via `alter publication`, but
   the dashboard toggle is what surfaces in the UI):
  - `todos`, `health_logs`, `journal_entries`, `appointments`, `baby_logs`
7. **Settings → API →** copy the **Project URL** and **publishable key**
   (`sb_publishable_*` — Supabase's new client-safe key, replaces the legacy
   `anon` JWT).

## Environment

Create `.env.local` at repo root from `.env.example`:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-ios-client-id
```

Note: Expo only exposes env vars prefixed `EXPO_PUBLIC_*` to the client.
`NEXT_PUBLIC_*` (Next.js convention) is silently ignored — the values won't
reach `lib/supabase.ts`. The variable is still named `ANON_KEY` for backward
compatibility; `sb_publishable_*` keys go in that slot.

The publishable key is client-safe only because RLS policies enforce
household-scoped access. Never put `sb_secret_*` keys (the new service-role
equivalent) in the mobile app.

## What the schema enforces

- One mother + one partner per household (`unique (household_id, role)`).
- 2-user cap on insert (`household_member_count(...) < 2` RLS check).
- Household-scoped read/write on every data table via `get_my_household_id()`.
- Partner-join flow goes through `join_household_by_code(code)` — a
  `security definer` RPC that bypasses RLS to look up the household by code
  before the joining user has a `users` row.

## APNs Function

Blueberry now includes a direct APNs Edge Function at
`supabase/functions/send-apns-notification/index.ts`.

Required function secrets:

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

Expected flow:

1. Create an APNs auth key in the Apple Developer portal.
2. Add the secrets to the Supabase project.
3. Deploy the Edge Functions.
4. Register a real iPhone from Blueberry's `More -> Notifications` screen.
5. Invoke the function with a stored token for end-to-end verification.

Example invocation payload:

```json
{
  "token": "device-token-from-device_push_tokens",
  "title": "Appointment reminder",
  "body": "20-week anatomy scan at 09:00 AM",
  "bundleId": "com.dbeveridge.blueberry",
  "environment": "sandbox"
}
```

Current limits:

- Cron jobs and DB-webhook orchestration for appointment reminders, partner
  check-ins, and todo events are not wired yet.
- Full APNs verification requires a real iPhone; the simulator cannot supply
  a production APNs token.

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
in those tables is lost. `auth.users` is untouched — Supabase Auth identities
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
