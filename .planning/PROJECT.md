# Project: Blueberry

## What This Is

Blueberry is a private pregnancy and early postpartum companion app for exactly two users: mother and partner. It is a personal household app, not a public product. The app helps both users stay aligned through pregnancy progress, shared todos, health logs, journal entries, appointments, kick counting, and labor timing.

## Core Value

Both users see the same trusted household view from separate phones: what week or stage they are in, what needs attention, what has been logged, and what support is needed next.

## Current State

This Codex repo is a clean start. It currently has no application code. Legacy Claude project artifacts were reviewed only for planning context and should not be copied into this workspace.

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
- Current pregnancy due date and stage must be reconfirmed before date-based defaults are seeded.

## Open Decisions

- Confirm current stage and due date. The old due date was October 5, 2025, which is stale as of May 15, 2026.
- Decide whether Google Calendar sync and push notifications are v1 or post-MVP.
- Decide whether AI-generated content is excluded from v1 or introduced behind a later feature flag.
- Confirm root-level Expo structure versus nested app directory. Recommendation: root-level Expo in this clean repo.
