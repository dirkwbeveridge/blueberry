---
workstream: push-notifications
created: 2026-06-09
updated: 2026-06-09
---

# Project State

## Current Position
**Status:** Planned
**Current Phase:** 01-push-notifications
**Last Activity:** 2026-06-09
**Last Activity Description:** Phase plan written — 01-01-PLAN.md created, ready for execution

## Progress
**Phases Complete:** 0
**Current Plan:** 01-01-PLAN.md (Wave 1, autonomous)

## Notification Events

| Event | Edge Function | Trigger | Recipient |
|---|---|---|---|
| Appointment reminder | `notify-appointment-reminder` | pg_cron, hourly | Both household members |
| Partner check-in shared | `notify-partner-checkin` | DB webhook: health_logs INSERT | Partner of the logger |
| Todo assigned | `notify-todo-assigned` | DB webhook: todos INSERT | Non-creator household member |
| Kick session reminder | `notify-kick-reminder` | pg_cron, daily | Pregnant-stage users with preference enabled |

## Privacy Boundary Decision

**Decision (locked):** Push payloads must never carry raw health-log data. Permitted payload body: a sentence Mom explicitly chose to share (`shared_note`), an appointment title, a todo title, or a generic signal string. This boundary is enforced server-side by `assertNoHealthData` in `supabase/functions/shared/pushPayload.ts` — a function that throws `PRIVACY_BOUNDARY_VIOLATION` if raw field names appear in any payload before dispatch. Every Edge Function must call this guard. The client has an additional `isSafePayload` sanity check in `lib/notifications.ts`, but the server guard is authoritative.

## Schema Changes Required

- `users`: add `push_token`, `notif_appointments`, `notif_partner_checkin`, `notif_todo_assigned`, `notif_kick_reminder`, `quiet_start`, `quiet_end`
- `health_logs`: add `share_with_partner`, `shared_note`

## Open Items Before Execution

1. **EAS Project ID:** `expo-notifications` `getExpoPushTokenAsync` requires a valid `projectId` in `app.json` under `extra.eas.projectId`. Confirm this is set before running the token registration hook.
2. **DB webhook configuration:** `notify-partner-checkin` and `notify-todo-assigned` require manual webhook setup in Supabase Dashboard after deployment. Document in `SUPABASE-SETUP.md`.
3. **pg_cron jobs:** `notify-appointment-reminder` and `notify-kick-reminder` require pg_cron extension enabled and cron jobs created via SQL Editor. Document in `SUPABASE-SETUP.md`.
4. **Real device for testing:** Push token dispatch cannot be tested on simulator. At least one real device needed for full end-to-end verification.
5. **Datetimepicker dependency:** `@react-native-community/datetimepicker` may need to be installed for the quiet-hours UI in the Notifications settings screen.

## Session Continuity
**Stopped At:** Planning complete — no execution started
**Resume File:** `.planning/workstreams/push-notifications/phases/01-push-notifications/01-01-PLAN.md`
