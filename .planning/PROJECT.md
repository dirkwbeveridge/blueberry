# Project: Blueberry

## What This Is

Blueberry is a private pregnancy and early postpartum companion app for exactly two users: mother and partner. It is a personal household app, not a public product. The app helps both users stay aligned through pregnancy progress, shared todos, health logs, journal entries, appointments, kick counting, and labor timing.

## Core Value

Both users see the same trusted household view from separate phones: what week or stage they are in, what needs attention, what has been logged, and what support is needed next.

## Current State

This repo is now an active Expo Router mobile app with substantial Phase 1 implementation completed. Core tabs/modals, Supabase integration, notifications settings, and Google Calendar sync logic are implemented and passing typecheck/lint. Remaining work is primarily external deployment/verification and finishing Phase 7b + remaining Family Mode surfaces.

## Product Principles

- Personal and private beats comprehensive and generic.
- Two-user household sync is the product spine.
- Health and labor safety features must degrade gracefully offline.
- The interface should feel warm and intimate, not clinical or enterprise-like.
- Partner workflows should be first-class, not an afterthought.

## Technical Direction

- Expo React Native for iOS and Android.
- TypeScript strict mode.
- Expo Router for file-based navigation.
- Supabase for Auth, Postgres, Storage, and Realtime.
- Zustand for app state; AsyncStorage for non-auth persistence.
- Secure token storage for auth sessions.
- Minimal dependencies until a phase proves need.

## Constraints

- Exactly two household users: `mother` and `partner`.
- Every household-owned database access must be scoped by `household_id`.
- Supabase RLS is the security boundary; client filtering is additional defense, not sufficient by itself.
- Contraction timer must run without network access.
- No legacy Firebase registry code or static HTML artifact code should enter this repo.
- Current pregnancy due date and stage must be user-entered and never hardcoded.

## Implementation Snapshot

- App structure: Expo SDK 54 + React Native + Expo Router + TypeScript strict.
- Data/auth: Supabase Auth + Postgres + Realtime with household-scoped RLS.
- Notifications: APNs token registration UI + local appointment reminders + APNs Edge Function scaffold (deployment pending).
- Google Calendar (7a): OAuth PKCE connect modal, secure token lifecycle, two-way sync engine, conflict-policy handling, appointment create/update/delete integration.
- Family Mode: postpartum trigger and tracker logging implemented; postpartum variants for key tabs still incomplete.

## Open Decisions

- Confirm final default conflict policy for Google sync (`google_wins` vs `blueberry_wins`) for production behavior.
- Confirm whether Apple Calendar/EventKit (7b) remains Phase 1 required or moves to immediate follow-on after APNs + Google real-device verification.
- Confirm Family Mode data-model direction long term (`baby_logs` JSONB consolidated model vs dedicated normalized postpartum tables).
- Confirm rollout order between Family Mode completion and Apple Calendar implementation based on real household urgency.
