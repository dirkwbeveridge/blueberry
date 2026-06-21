---
workstream: push-notifications
created: 2026-06-09
updated: 2026-06-20 (local APNs implementation hardened in real repo)
---

# Project State

## Current Position
**Status:** In progress
**Current Phase:** 01-push-notifications
**Last Activity:** 2026-06-20
**Last Activity Description:** Local APNs token sync, notification settings UI, local appointment reminder flow, and APNs Edge Function reviewed and hardened in the real repo

## Progress
**Phases Complete:** 0
**Current Plan:** 01-01-PLAN.md (execution started locally; external deployment still pending)

## Notification Events

| Event | Edge Function | Trigger | Recipient |
|---|---|---|---|
| Appointment reminder | `notify-appointment-reminder` | pg_cron, hourly | Both household members |
| Partner check-in shared | `notify-partner-checkin` | DB webhook: health_logs INSERT | Partner of the logger |
| Todo assigned | `notify-todo-assigned` | DB webhook: todos INSERT | Non-creator household member |
| Kick session reminder | `notify-kick-reminder` | pg_cron, daily | Pregnant-stage users with preference enabled |

## Privacy Boundary Decision

**Decision (locked):** Push payloads must never carry raw health-log data. Permitted payload body: a sentence Mom explicitly chose to share (`shared_note`), an appointment title, a todo title, or a generic signal string. This boundary is enforced server-side by `assertNoHealthData` in `supabase/functions/shared/pushPayload.ts` — a function that throws `PRIVACY_BOUNDARY_VIOLATION` if raw field names appear in any payload before dispatch. Every Edge Function must call this guard. The client has an additional `isSafePayload` sanity check in `lib/notifications.ts`, but the server guard is authoritative.

## Tech Stack Decision (locked 2026-06-09)

**Native APNs/FCM via Supabase Edge Functions. No Expo Push Service.**

- Client: `expo-notifications` `getDevicePushTokenAsync()` — raw native token, no EAS, no exp.host.
- Server: Edge Functions dispatch directly to APNs and FCM.
- `users.push_platform` ('ios' | 'android') stored alongside `push_token` so Edge Functions route correctly.

## Schema Changes Required

- `users`: add `push_token`, `notif_appointments`, `notif_partner_checkin`, `notif_todo_assigned`, `notif_kick_reminder`, `quiet_start`, `quiet_end`
- `health_logs`: add `share_with_partner`, `shared_note`

## Required Secrets (Supabase Edge Functions)

| Secret | Source |
|--------|--------|
| `APNS_AUTH_KEY` | p8 file from Apple Developer Portal → Keys |
| `APNS_KEY_ID` | 10-char Key ID from Apple Developer Portal |
| `APNS_TEAM_ID` | 10-char Team ID from developer.apple.com |
| `APNS_BUNDLE_ID` | App bundle identifier, e.g. `com.blueberry.app` |
| `APNS_ENV` | `sandbox` (dev) or `production` (App Store/TestFlight) |
| ~~FCM_SERVICE_ACCOUNT_JSON~~ | Not required — Android/FCM deferred |
| ~~FCM_PROJECT_ID~~ | Not required — Android/FCM deferred |

## Open Items Before Completion

1. **APNs Auth Key:** Create at developer.apple.com → Keys → Add → Apple Push Notifications service. Requires Apple Developer Program. Download p8 file once and store as `APNS_AUTH_KEY` Supabase secret.
2. ~~FCM Setup~~ — Android/FCM deferred. Not required for v1.
3. **Supabase deployment:** Apply `supabase-schema.sql`, the push-token migration, function secrets, and deploy `send-apns-notification`.
4. **DB webhook configuration:** `notify-partner-checkin` and `notify-todo-assigned` require manual webhook setup in Supabase Dashboard after deployment.
5. **pg_cron jobs:** `notify-appointment-reminder` and `notify-kick-reminder` require pg_cron extension and cron job SQL.
6. **Real device for testing:** APNs tokens cannot be obtained on iOS Simulator. At least one real device needed for full end-to-end test.

## Session Continuity
**Stopped At:** Local implementation and build verification complete; remote delivery deployment and device verification still pending
**Resume File:** `SUPABASE-SETUP.md`
