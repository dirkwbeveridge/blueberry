# Phase 1 Context: Foundation

**Phase:** 1  
**Name:** Foundation  
**Status:** Ready to execute after plan approval  
**Created:** 2026-05-15

## Phase Goal

Create the technical foundation for the clean Codex-owned Blueberry app: a running Expo TypeScript app, navigation skeleton, warm design system, shared UI primitives, Supabase schema/setup docs, typed domain model, and persisted non-auth household state.

## Requirements Covered

- **INFRA-01:** Expo React Native app initializes cleanly in this repo and runs on iOS and Android development targets.
- **INFRA-02:** TypeScript strict mode is enabled with shared domain types and no `any` usage in app code.
- **INFRA-03:** Design tokens define color, type, spacing, radii, and shared component primitives for a warm private companion app.
- **INFRA-04:** Supabase schema, RLS policies, and setup instructions exist before feature code depends on remote data.
- **INFRA-05:** App state store persists household context locally without storing auth tokens in AsyncStorage.

## Locked Decisions

- Use this repo as the app root. Do not create a nested `blueberry/` app folder.
- Do not copy legacy Firebase registry files, static HTML artifacts, generated outputs, or old git history.
- Use Expo React Native with TypeScript and Expo Router.
- Use Supabase for Auth/Postgres/Realtime/Storage.
- Use Zustand plus AsyncStorage for non-auth app state.
- Store auth sessions using secure storage when auth is implemented; Phase 1 must prepare for this but does not implement login.
- Every household-owned database table must include `household_id` and RLS policies must enforce household isolation.
- Current due date and stage are not known. Do not seed stale dates from the old Claude project.

## Updated Technical Notes

- The old Claude plan referenced Expo SDK 51 and `blank-typescript`. Current Expo docs recommend the default template for TypeScript plus Expo Router, and note SDK 54 versus SDK 55 differences during the transition period.
- For this private app, Phase 1 should prioritize a boring, easy-to-run scaffold over premature integration complexity.
- Supabase setup should be produced as SQL plus manual Dashboard instructions. Do not require Supabase CLI in Phase 1.

## Out of Phase

- Real auth screens beyond placeholders.
- Live Supabase queries.
- Google Calendar sync.
- Push notifications.
- AI-generated content.
- Postpartum feeding/sleep/diaper feature depth.
- Visual polish beyond stable design primitives and coherent placeholder screens.

## Risks

- Expo SDK selection affects Expo Go compatibility. Phase 1 should document the chosen SDK/template in `README.md`.
- RLS policy mistakes are high risk because this is personal health/family data. Keep schema setup explicit and reviewable.
- `expo-secure-store` availability differs by runtime. Phase 1 should install and document it, but session behavior is verified in Phase 2.
