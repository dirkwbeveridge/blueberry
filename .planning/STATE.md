# State: Blueberry

**Last Updated:** 2026-06-26
**Current Focus:** Phase 1 live verification and APNs deployment readiness, with Google Calendar and Family Mode work kept accurate to what is already merged on `main`.

## Progress

| Phase | Status |
| --- | --- |
| Phase 0: Clean Planning | Complete |
| Phase 1: Foundation | Merged on `main`; typecheck/lint and simulator build evidence exist, but live golden-path verification is still pending |
| Phase 2: Auth and Household | Merged on `main`, including the setup-flow fix; deployed-Supabase golden path is still pending |
| Phase 3: Home and Shared Todos | Prototype screen ported |
| Phase 4: Health Logging and Journal | Health logging and Journal tab are merged on `main`; live-flow verification is still pending |
| Phase 5: Pregnancy Tracking Tools | Kick counter and contraction timer ported |
| Phase 6: Partner and Appointments | Partner, plan, todos, and appointments ported |
| Phase 7a: Google Calendar sync | Code complete in app (OAuth PKCE, token lifecycle, two-way sync, conflict policy). Real-device verification still pending. |
| Phase 7b: Apple Calendar (EventKit) sync | Planned, not started. |
| Phase 7c: Push notifications (APNs/FCM) | APNs-first implementation is merged locally on `main`; backend deployment and real-device verification are still pending, and production APNs completion remains blocked by pending Apple Developer approval. |
| Phase 7d: AI content | Remains deferred. |
| Phase 8: Family Mode (postpartum) | Begin Family Mode trigger, Baby tab, and core baby logging are merged on `main`; postpartum screen variants and dedicated sync surfaces still pending. |

## Current Decisions

- Use this repo as the source of truth for all new planning and implementation.
- Keep `Blueberry App/blueberry` and `z-Archive-Blueberry` as reference/archive only.
- Do not import legacy registry implementation files or git history.
- Preserve the two-user private pregnancy companion concept.
- Use GSD phase planning before code execution.
- **Due date is entered by the user during initial household setup. App derives `stage` from `due_date` + `baby_dob`. Never seed either value in code, fixtures, or migrations.**
- **Google Calendar, Apple Calendar (EventKit), and push notifications are Phase 1 must-haves** (2026-05-23 decision). AI content remains Phase 7-deferred.
- **Phase 7a (Google sync) is implemented in code** with policy-aware conflict handling (`google_wins` / `blueberry_wins`) and manual/foreground sync flows.
- **Apple Developer approval is still pending as of 2026-06-26.** Treat APNs production completion as blocked until that approval lands and the production key/secrets path can be completed.
- Use root-level Expo app structure unless execution uncovers a hard scaffold limitation.
- Prefer the current Expo default template with Expo Router instead of the stale SDK 51 `blank-typescript` approach from the old plan.

## Blockers

- Golden path against deployed Supabase has not been verified end-to-end (sign up, create household, partner-join, realtime sync).
- Setup flow's due-date handling not validated for past dates. The test household's real due date is 2025-10-11 (postpartum); Phase 1 UI is pregnancy-focused. For Phase 1 golden-path testing, manually enter a future due date in the test household.
- Golden path against deployed Supabase still needs current real-repo verification after the recent notification changes.
- Google Calendar real-device verification (OAuth and sync correctness) remains a concrete gate for Phase 1 exit.
- Apple Calendar/EventKit two-way sync implementation is still a concrete gate (7b).
- Apple Developer approval is still pending as of 2026-06-26, so APNs production key creation/secrets completion remains blocked.
- APNs backend deployment, secrets, and real-device verification are still external blockers even though the local implementation is merged.
- Family Mode pregnancy-to-postpartum trigger is implemented; postpartum variants in Home/Health/Together still need completion for full usability.
- Expo web smoke test currently fails before React mounts with `Cannot use 'import.meta' outside a module`. Mobile Metro startup succeeds; web is not a Phase 1 product target.

## Verification Evidence

- `npm run typecheck` passes.
- `npm run lint` passes.
- `xcodebuild -workspace ios/Blueberry.xcworkspace -scheme Blueberry ... build` succeeds for the iOS simulator in the real repo.
- `main` includes the merged design-system foundation work, the setup-flow fix (PS-61), Journal tab wiring (PS-62), and contraction-timer guard fixes.
- Advanced prototype implementation has been ported into the root app: auth, home, weeks, health, plan, partner, add todo, add appointment, log symptom, and contraction timer.
- Native notifications work is now present in the real repo: notification settings modal, APNs token sync, local appointment reminders, and an APNs Edge Function scaffold.
- Google Calendar sync code exists and is wired end-to-end in app flows: OAuth connect modal, token refresh, create/update/delete propagation, and foreground pull sync.
- Family Mode trigger surfaces now exist in the app: More -> Begin Family Mode, postpartum Baby tab gating, and `baby_logs`-backed tracker flows.
- `npm ci` completed in the root app and repaired the incomplete local dependency tree.
- `npx expo start --localhost --port 8081` starts Metro successfully outside the sandbox.
- Expo Go device validation passed after fixing the unstable Zustand selector in `hooks/useHousehold.ts`; phone shows `Stage not set` and the shared app shell, with pages clickable.
- Sandbox-local port binding is blocked with `EPERM`; Expo start needs elevated local-port permission in this environment.
- Supabase setup artifacts exist: `supabase-schema.sql`, `supabase_migration.sql`, `SUPABASE-SETUP.md`, `.env.example`.
- Active source files exist under `app/`, `components/`, `constants/`, `hooks/`, `lib/`, `store/`, and `types/`.

## Next Actions

1. Verify the current golden path on a physical device: sign up, create household, partner join, shared data, Journal visibility, and the Notifications modal.
2. Deploy or confirm the active Supabase schema/migrations that the merged app now expects, including push-token and `baby_logs` support.
3. Keep APNs work split into two truths: local implementation is merged, but production completion stays blocked until Apple Developer approval lands.
4. Real-device verify Phase 7a behavior: connect flow, sync counters, and conflict-policy outcomes.
5. Implement Phase 7b gate: Apple Calendar/EventKit schema + app integration.
6. Resume Family Mode completion: postpartum variants for Home/Health/Together and shared night-shift surfaces.

## Session Continuity

Last session: 2026-06-26
Stopped at: Planning/state reconciliation against merged `main`, with APNs production still blocked on pending Apple Developer approval and live verification still outstanding.
Resume file: SUPABASE-SETUP.md
