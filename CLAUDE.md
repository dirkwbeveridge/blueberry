# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Blueberry is a private two-user (mother + partner) pregnancy companion mobile app. Expo SDK 54 / React Native 0.81 / React 19 with Expo Router, TypeScript strict, Supabase backend, Zustand state. Web is **not** a Phase 1 target — `import.meta` currently breaks the web bundle.

## Commands

```bash
npm run typecheck                       # tsc --noEmit
npm run lint                            # expo lint
npx expo start --localhost --port 8081  # dev (sandbox needs elevated perms)
npm run ios | npm run android | npm run web
npm ci                                  # repair local deps
```

There is no test runner configured. Verification is `typecheck` + `lint` + manual run.

## Environment

Copy `.env.example` → `.env.local`:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Supabase schema must be deployed (`supabase-schema.sql`, then `supabase_migration.sql`) before any data flow works. RLS is enabled on every table — the anon key is only client-safe because of those policies. Never add a service-role key to the client. See `SUPABASE-SETUP.md` for the table/realtime checklist.

## Architecture

**Routing (Expo Router, file-based):** `app/_layout.tsx` is the auth gate. It loads fonts, subscribes to Supabase auth, and on a valid session hydrates the household store by reading `users` → `households` → partner `users` row. If there is no session **or** no matching `users` row, it routes to `(auth)`; otherwise `(tabs)`. `(modals)` is a separate stack mounted with `presentation: 'modal'`. Typed routes are enabled (`app.json` experiments).

**State:** `store/household.ts` (Zustand + AsyncStorage persist, key `blueberry-household`) is the single source of truth for household, current/partner users, and derived `currentWeek`. `currentWeek` is recomputed from `due_date` whenever the household is set, via `lib/pregnancy.ts`. UI consumes selectors (`useCurrentWeek`, `useTrimester`, etc.).

**Supabase client (`lib/supabase.ts`):** Uses `expo-secure-store` as the auth storage adapter and `react-native-url-polyfill/auto`. The client is intentionally untyped (`createClient<any>`) — apply row types at the call site by casting through `unknown` to a `types/index.ts` interface. Don't generate or commit Supabase generated types unless you also retype the client.

**Realtime:** `hooks/useRealtimeSync.ts` subscribes to `todos`, `health_logs`, `journal_entries`, `appointments`. Those four tables must have Realtime enabled in Supabase or the household view will silently go stale.

**Data model (`types/index.ts`, `supabase-schema.sql`):** Everything is scoped by `household_id`. Two users per household (`role: 'mother' | 'partner'`), joined via an `invite_code`. Stage transitions: `ttc → pregnant → postpartum` (setting `baby_dob` flips stage to `postpartum`).

**Design system:** `constants/theme.ts` holds tokens. Typography uses Playfair Display (serif, display) + DM Sans (sans, body) loaded in the root layout via `@expo-google-fonts`. Splash + brand color: `#FAF8F5` (light) / `#1A1A2E` (dark). Primitives in `components/ui/`, feature components in `components/home/`. Reuse primitives — don't reach for raw `View`/`Text` for new screens.

**Pregnancy content:** Week-indexed copy in `constants/weekContent.ts` and `constants/babyDevelopment.ts`. Week math (`getCurrentWeek`, `getTrimester`) lives in `lib/pregnancy.ts` and clamps to 1–40.

## Conventions

- TypeScript strict; no `any` outside the Supabase client cast site.
- Path imports are relative (no `@/` alias configured).
- Two-space indent; aligned multi-assignment blocks are intentional (see `app/_layout.tsx`) — preserve when editing nearby code.
- When adding a Supabase query, cast the response shape: `as unknown as MyType` against an interface in `types/index.ts`.
- New screens go under `app/(tabs)` or `app/(modals)`; auth screens under `app/(auth)`. Update the relevant `_layout.tsx` if the stack needs new options.
- `SUPABASE-SETUP.md` lists which tables need Realtime — keep it in sync if you add a synced table.

## Planning

GSD planning artifacts live in `.planning/`. Legacy Firebase/Claude registry artifacts from the prior prototype were intentionally dropped — don't reintroduce them.
