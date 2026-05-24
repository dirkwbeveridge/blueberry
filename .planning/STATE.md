# State: Blueberry

**Last Updated:** 2026-05-23  
**Current Focus:** Phase 1 golden-path verification; integrations scope expanded.

## Progress

| Phase | Status |
| --- | --- |
| Phase 0: Clean Planning | Complete |
| Phase 1: Foundation | Consolidated and type/lint verified |
| Phase 2: Auth and Household | Prototype flow ported, Supabase golden path pending |
| Phase 3: Home and Shared Todos | Prototype screen ported |
| Phase 4: Health Logging and Journal | Health logging ported, journal not in active tab set |
| Phase 5: Pregnancy Tracking Tools | Kick counter and contraction timer ported |
| Phase 6: Partner and Appointments | Partner, plan, todos, and appointments ported |
| Phase 7a: Google Calendar sync | Promoted to Phase 1 (2026-05-23). Not started. |
| Phase 7b: Apple Calendar (EventKit) sync | Promoted to Phase 1 (2026-05-23). Not started. |
| Phase 7c: Push notifications (APNs/FCM) | Promoted to Phase 1 (2026-05-23). Not started. |
| Phase 7d: AI content | Remains deferred. |
| Phase 8: Family Mode (postpartum) | Schema reserved, not planned. |

## Current Decisions

- Use this repo as the source of truth for all new planning and implementation.
- Keep `Blueberry App/blueberry` and `z-Archive-Blueberry` as reference/archive only.
- Do not import legacy registry implementation files or git history.
- Preserve the two-user private pregnancy companion concept.
- Use GSD phase planning before code execution.
- **Due date is entered by the user during initial household setup. App derives `stage` from `due_date` + `baby_dob`. Never seed either value in code, fixtures, or migrations.**
- **Google Calendar, Apple Calendar (EventKit), and push notifications are Phase 1 must-haves** (2026-05-23 decision). AI content remains Phase 7-deferred.
- Use root-level Expo app structure unless execution uncovers a hard scaffold limitation.
- Prefer the current Expo default template with Expo Router instead of the stale SDK 51 `blank-typescript` approach from the old plan.

## Blockers

- Golden path against deployed Supabase has not been verified end-to-end (sign up, create household, partner-join, realtime sync).
- Setup flow's due-date handling not validated for past dates. The test household's real due date is 2025-10-11 (postpartum); Phase 1 UI is pregnancy-focused. For Phase 1 golden-path testing, use a future placeholder due date.
- Google Calendar, Apple Calendar, and push notification implementations all not started; need phase plans.
- Full iOS simulator launch has not been re-verified after consolidation.
- Expo web smoke test currently fails before React mounts with `Cannot use 'import.meta' outside a module`. Mobile Metro startup succeeds; web is not a Phase 1 product target.

## Verification Evidence

- `npm run typecheck` passes.
- `npm run lint` passes.
- Advanced prototype implementation has been ported into the root app: auth, home, weeks, health, plan, partner, add todo, add appointment, log symptom, and contraction timer.
- `npm ci` completed in the root app and repaired the incomplete local dependency tree.
- `npx expo start --localhost --port 8081` starts Metro successfully outside the sandbox.
- Expo Go device validation passed after fixing the unstable Zustand selector in `hooks/useHousehold.ts`; phone shows `Stage not set` and the shared app shell, with pages clickable.
- Sandbox-local port binding is blocked with `EPERM`; Expo start needs elevated local-port permission in this environment.
- Supabase setup artifacts exist: `supabase-schema.sql`, `supabase_migration.sql`, `SUPABASE-SETUP.md`, `.env.example`.
- Active source files exist under `app/`, `components/`, `constants/`, `hooks/`, `lib/`, `store/`, and `types/`.

## Next Actions

1. Deploy the Supabase SQL for the active schema before auth testing.
2. Start Expo and test the golden path: sign up, choose role, create household, complete setup, land on Home. Use a future placeholder due date until Family Mode exists.
3. Re-verify device launch after the consolidation.
4. Plan Phase 7a (Google Calendar two-way sync). Includes OAuth scope, event mapping to `appointments.google_event_id`, conflict resolution rules.
5. Plan Phase 7b (Apple Calendar / EventKit two-way sync). Includes iOS permission flow, schema column for the EventKit identifier.
6. Plan Phase 7c (push notifications via Expo's notification service or APNs/FCM directly). Includes notification copy following [[voice-and-copy]] rules, payload privacy boundary (no raw Mom health logs in payloads).
7. Begin Family Mode (Phase 8) planning so the postpartum transition exists in code before the test household's real situation overtakes Phase 1 scope.
