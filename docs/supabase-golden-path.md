# Supabase Golden Path

This document defines what "golden path ready" means for the current Blueberry
Supabase integration without claiming live deployment or successful external
verification.

## What is in scope

The current Phase 1 Supabase golden path covers:

- email/password auth through Supabase Auth
- household creation for the first user
- household join by invite code for the second user
- household-scoped reads and writes for shared app data
- Realtime sync for the five collaborative tables
- storage of notification preferences and native push tokens
- local appointment reminder scheduling in the app

## What is not in scope

These are explicitly out of scope for a successful Phase 1 golden-path pass:

- Apple-gated APNs delivery verification
- deployed Edge Function confirmation
- cron-driven server reminders
- webhook-triggered push automation
- web parity

## Runtime assumptions

The app expects these runtime conditions to be true:

- `EXPO_PUBLIC_SUPABASE_URL` points at the intended UAT project
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` contains a valid client-safe key
- `supabase-schema.sql` has been applied to that project
- RLS is enabled on the Blueberry tables
- the app user has a matching `users` row tied to a household

## Data model expectations

Shared household data:

- `health_logs`
- `appointments`
- `todos`
- `journal_entries`
- `baby_logs`

Single-user logging, stored but not broadcast over Realtime:

- `kick_sessions`
- `contraction_sessions`

User-scoped notification data:

- `device_push_tokens`
- `notification_preferences`

## Realtime expectations

Expected Realtime tables:

- `todos`
- `health_logs`
- `journal_entries`
- `appointments`
- `baby_logs`

Expected non-Realtime tables:

- `households`
- `users`
- `device_push_tokens`
- `notification_preferences`
- `kick_sessions`
- `contraction_sessions`

If a tester expects household metadata or kick/contraction sessions to update on
another device instantly, that expectation is outside the current implementation.

## Auth and household expectations

Successful sign-in alone is not enough. The app reaches the main tabs only when
both conditions are true:

- there is an active Supabase session
- there is a matching `users` row in the Blueberry schema

Creation and join flows rely on these RPCs:

- `create_household(p_role, p_invite_code)`
- `join_household_by_code(code)`

If those functions are missing or blocked, signup can appear partially working
while the app never reaches a usable household state.

## Notification expectations

Current notification readiness means:

- the app can request iOS notification permission
- the app can read an APNs device token on a real iPhone build
- the app can persist that token into `device_push_tokens`
- the app can persist notification preferences
- the app can schedule local appointment reminders

Current notification readiness does not mean:

- live APNs payload delivery has been proven
- Apple account setup is complete
- server-side reminder orchestration is deployed
