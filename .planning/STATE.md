# State: Blueberry

**Last Updated:** 2026-05-22  
**Current Focus:** Consolidated active implementation

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
| Phase 7: Integration Decision and Add-ons | Not started |

## Current Decisions

- Use this repo as the source of truth for all new planning and implementation.
- Keep `Blueberry App/blueberry` and `z-Archive-Blueberry` as reference/archive only.
- Do not import legacy registry implementation files or git history.
- Preserve the two-user private pregnancy companion concept.
- Use GSD phase planning before code execution.
- Reconfirm date-sensitive pregnancy facts before seeding stage/week defaults.
- Use root-level Expo app structure unless execution uncovers a hard scaffold limitation.
- Prefer the current Expo default template with Expo Router instead of the stale SDK 51 `blank-typescript` approach from the old plan.

## Blockers

- Current pregnancy stage and due date are stale in legacy docs and need confirmation.
- Integration scope for Google Calendar, push notifications, and AI content should be confirmed before those phases.
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

1. Deploy the Supabase SQL for the active schema/migration before auth testing.
2. Start Expo and test the golden path: sign up, choose role, create household, complete setup, land on Home.
3. Re-verify device launch after the consolidation.
