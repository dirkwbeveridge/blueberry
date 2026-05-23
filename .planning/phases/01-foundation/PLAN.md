# Phase 1 Plan: Foundation

**Phase:** 1  
**Mode:** MVP foundation  
**Status:** Ready for execution  
**Created:** 2026-05-15

## Goal

Build a root-level Expo TypeScript app skeleton for Blueberry with routing, theme, shared components, Supabase setup artifacts, domain types, and local household store. Do not implement real auth or data-entry workflows yet.

## Guardrails

- Do not copy files from the old Claude project.
- Do not create a nested `blueberry/` folder.
- Do not seed the stale October 5, 2025 due date.
- Do not add Firebase.
- Do not add Google Calendar, push notifications, AI, or wearable dependencies.
- Avoid `any` in app code.
- Keep all personal data access designed around `household_id` plus RLS.

## Work Plan

### Task 1: Scaffold Root Expo App

Run from `/Users/dbeveridge/Documents/Blueberry`:

```bash
npx create-expo-app@latest . --template default
```

Then verify the generated project structure and package versions. If the command refuses to scaffold into a git directory with existing `.planning/`, use the safest supported Expo alternative that keeps the app at the repository root and does not overwrite `.planning/`.

Expected outputs:

- `package.json`
- `app.json` or equivalent Expo config
- Expo Router-compatible `app/` directory
- TypeScript config
- npm lockfile

### Task 2: Install Foundation Dependencies

Install only the foundation packages required for Phase 1:

```bash
npx expo install @supabase/supabase-js react-native-url-polyfill
npx expo install @react-native-async-storage/async-storage expo-secure-store
npx expo install zustand
npx expo install expo-font expo-splash-screen
npx expo install @expo-google-fonts/playfair-display @expo-google-fonts/dm-sans
```

If the generated template already includes a listed package, do not reinstall unnecessarily.

### Task 3: Configure Strict TypeScript and Scripts

Update project scripts so these exist:

```json
{
  "typecheck": "tsc --noEmit",
  "lint": "expo lint"
}
```

Set TypeScript strict mode if the generated config does not already do so.

Acceptance:

- `npm run typecheck` is available.
- `npm run lint` is available.
- TypeScript strict behavior is enabled.

### Task 4: Create Theme and Shared UI Primitives

Create:

- `constants/theme.ts`
- `components/ui/Card.tsx`
- `components/ui/Button.tsx`
- `components/ui/Input.tsx`
- `components/ui/Badge.tsx`
- `components/ui/ProgressBar.tsx`
- `components/shared/LoadingScreen.tsx`

Theme requirements:

- Preserve the warm Blueberry direction from legacy planning.
- Use deep blueberry purple as primary, warm off-white background, white surfaces, muted lavender border/accent, readable dark text.
- Export colors, spacing, radii, typography, and reusable shadow/card style helpers.

Acceptance:

- UI primitives are typed.
- Components support basic loading/disabled/error states where relevant.
- No primitive imports feature-specific code.

### Task 5: Create Domain Types

Create `types/index.ts` with:

- `Stage`
- `Role`
- `Priority`
- `TodoSource`
- `Household`
- `AppUser`
- `HealthLog`
- `Todo`
- `JournalEntry`
- `Appointment`
- `KickSession`
- `ContractionSession`
- `BabyDevelopmentWeek`

Acceptance:

- All fields match the planned Supabase schema.
- Nullable database fields are represented explicitly.
- No `any`.

### Task 6: Create Pregnancy Utilities and Baby Development Data

Create:

- `lib/pregnancy.ts`
- `constants/babyDevelopment.ts`

Requirements:

- Date utilities must accept explicit `now` parameters where useful for testability.
- Due-date-based functions must tolerate `null` due dates.
- Do not hardcode stale pregnancy state.
- Baby development data can start with week 1-40 static content, but UI must handle missing or unknown current week.

Acceptance:

- Exports are typed.
- Edge cases clamp week/progress values.

### Task 7: Create Supabase Client Placeholder

Create `lib/supabase.ts`.

Requirements:

- Import `react-native-url-polyfill/auto`.
- Read `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Export a typed Supabase client.
- Avoid crashing placeholder screens when env vars are missing during first scaffold.
- Leave secure auth storage adapter ready for Phase 2.

Acceptance:

- Module imports without real credentials.
- README clearly says real credentials are required before auth/data phases.

### Task 8: Create Household Store and Hooks

Create:

- `store/household.ts`
- `hooks/useHousehold.ts`
- `hooks/useRealtimeSync.ts`

Store requirements:

- Zustand store persists household, current user, partner user, and current stage/week context.
- Persist only non-auth app state.
- Use key `blueberry-household`.
- Include `clearAll`.

Acceptance:

- Store typechecks.
- Persistence adapter uses AsyncStorage.
- No auth token fields exist in persisted state.

### Task 9: Build Route Skeleton

Create or replace app routes so the foundation has:

- Root layout.
- Auth layout and login placeholder.
- Tab layout with Home, Journal, Health, Kicks, Partner.
- Modal routes for Log Symptom, Add Todo, and Contraction Timer.

Acceptance:

- Placeholders use theme tokens.
- Navigation has stable names and titles.
- No screen assumes a real Supabase session yet.

### Task 10: Create Supabase Schema and Setup Docs

Create:

- `supabase-schema.sql`
- `SUPABASE-SETUP.md`
- `.env.example`
- Update `README.md`

Schema requirements:

- `households`
- `users`
- `health_logs`
- `appointments`
- `todos`
- `journal_entries`
- `milestones`
- `kick_sessions`
- `contraction_sessions`
- Useful postpartum tables can be included only if they do not complicate v1 RLS.
- RLS enabled on all app tables.
- Policies enforce household isolation.
- Realtime enabled on initial shared tables: `todos`, `health_logs`, `journal_entries`, `appointments`.

Setup docs:

- Explain manual SQL deployment through Supabase Dashboard.
- Explain required env vars.
- Explain that Phase 2 cannot proceed until schema deployment is confirmed.

Acceptance:

- SQL can be reviewed as one file.
- Setup docs have a clear checklist.

### Task 11: Verification

Run:

```bash
npm run typecheck
npm run lint
```

Then start the app:

```bash
npx expo start
```

Manual check:

- App renders without red screen.
- All tab placeholders are reachable.
- No route imports fail.
- Missing Supabase credentials do not crash placeholder UI.

### Task 12: Update GSD State

After verification:

- Update `.planning/STATE.md` with Phase 1 completion status or blockers.
- Mark completed INFRA requirements in `.planning/REQUIREMENTS.md` only if verified.
- Record SDK/template/package choices in README and state.

## Completion Criteria

Phase 1 is complete only when:

1. App runs locally from repo root.
2. `npm run typecheck` passes.
3. `npm run lint` passes or documented lint setup blocker exists.
4. Route skeleton renders without runtime errors.
5. Supabase schema and setup docs exist.
6. Household store persists non-auth state.
7. GSD state reflects the verified result.

## Plan Check

This plan satisfies all Phase 1 roadmap success criteria:

- App scaffold: Tasks 1, 2, 9, 11.
- TypeScript: Tasks 3, 5, 11.
- Navigation routes: Task 9.
- Design tokens/components: Task 4.
- Supabase schema/setup: Task 10.
- Store persistence: Task 8.

Known blockers before execution:

- Network access is required for `create-expo-app` and package installation.
- Expo SDK choice may depend on what `create-expo-app@latest --template default` generates on execution day.
