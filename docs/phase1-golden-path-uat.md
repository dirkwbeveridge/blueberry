# Phase 1 Golden Path UAT

This is the operator-facing manual pass for Blueberry's current Supabase-backed
golden path. It is designed to reduce ambiguity for the next human verification
run.

## Preconditions

Before launching the app, confirm:

1. `supabase-schema.sql` has been applied to the target project.
2. The five Realtime tables are present in `supabase_realtime`.
3. `.env.local` points at that same Supabase project.
4. A runnable app build exists for the intended device or simulator.

Optional but useful:

- a second device or second test account for join-flow and shared-data checks
- a real iPhone if you want to inspect local notification permission/token paths

Blocked for this UAT pass:

- Apple Developer approval is still pending
- end-to-end APNs delivery should not be treated as a pass/fail gate yet

## Recommended test order

Run the steps in this order. Earlier failures often invalidate later checks.

### 1. Auth bootstrap

Expected result:

- user can sign up with email/password
- app advances from credentials to role/household setup

Failure interpretation:

- if sign-up itself fails, check Supabase Auth configuration first
- if sign-up succeeds but the user never reaches role/household setup, check the
  app build and client env values

### 2. Create-household path

Using a fresh test account acting as the first user:

1. Choose a role.
2. Create a new household.
3. Complete setup details.

Expected result:

- `create_household(...)` succeeds
- a `households` row exists
- a matching `users` row exists for the signed-in user
- the app routes into the main tab flow
- the user sees an invite code

Failure interpretation:

- if auth exists but the app stays in auth screens, inspect `users` and
  `households` rows in Supabase
- if setup saves partially, verify the RPCs and RLS policies from
  `supabase-schema.sql`

### 3. Join-household path

Using a second account acting as the partner:

1. Sign up or sign in.
2. Choose the partner role.
3. Join using the invite code from step 2.

Expected result:

- `join_household_by_code(...)` returns the target household id
- the partner `users` row is inserted successfully
- the second user lands in the main app
- both users now belong to the same household

Known blocker to watch:

- once a household already has two users, further joins must fail by design

### 4. Shared data CRUD

Verify each shared table through the app:

- create at least one todo
- create at least one appointment
- create at least one health log
- create at least one journal entry
- create at least one baby log if the UI/build being tested exposes that path

Expected result:

- inserts succeed without manual SQL intervention
- new rows carry the active `household_id`
- data is readable after screen refresh or relaunch

### 5. Realtime behavior

With two active clients in the same household, verify the collaborative tables:

- `todos`
- `health_logs`
- `journal_entries`
- `appointments`
- `baby_logs`

Expected result:

- changes on one client appear on the other without manual reload

Do not file false regressions for these tables unless both clients are in the
same household and connected to the same project.

Do not expect Realtime for:

- `kick_sessions`
- `contraction_sessions`
- notification settings
- household metadata

### 6. Local notification settings path

Only if running on a real iPhone build:

1. Open `More -> Notifications`.
2. Check permission state.
3. Sync the device token if permission is allowed.
4. Save notification preferences.

Expected result:

- permission status loads
- token sync either succeeds or returns a clear permission/device error
- preference save persists without RLS failures

What this does not prove:

- live APNs delivery
- deployed Edge Function correctness

### 7. Local appointment reminder path

If notification permission is granted:

1. Ensure appointment reminders are enabled in notification preferences.
2. Create or edit an appointment at least 24 hours in the future.
3. Save preferences again if needed to force a local resync path.

Expected result:

- the app can schedule a local reminder approximately 24 hours before the
  appointment, adjusted for quiet hours when applicable

Known limitation:

- appointments less than 24 hours away do not produce a future local reminder

## Known blockers and non-gates

Blocked externally:

- Apple Developer approval
- account-backed APNs secret validation
- production push deployment signoff

Not a blocker for this UAT pass:

- lack of end-to-end remote push delivery proof
- missing cron/webhook automation
- missing web verification

## Suggested evidence to capture

For each manual pass, capture:

- which Supabase project was used
- whether `supabase-schema.sql` was freshly applied or reused
- whether both create and join flows were tested
- whether Realtime was verified on one or two devices
- whether notification checks were done on simulator or real iPhone
- exact failing step if the pass stops early
