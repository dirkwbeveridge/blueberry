# Roadmap: Blueberry

**Milestone:** v1 private household companion  
**Created:** 2026-05-15  
**Workflow:** GSD, clean Codex-owned repo

## Phase 0: Clean Planning

**Goal:** Establish a clean Codex plan from useful legacy context without importing legacy implementation artifacts.

**Status:** Complete

**Success Criteria**

1. Old planning files inspected.
2. Preserve/discard/reconfirm decisions documented.
3. New `.planning/` files created in this repo.

## Phase 1: Foundation

**Goal:** Create a running Expo TypeScript app with navigation skeleton, design tokens, shared UI primitives, Supabase schema/setup docs, typed domain model, and local household store.

**Status:** Planned

**Requirements:** INFRA-01 through INFRA-05

**Success Criteria**

1. App runs locally without missing-module crashes.
2. TypeScript check passes.
3. Navigation routes exist for auth, home, journal, health, kicks, partner, and modals.
4. Design tokens and shared UI primitives are importable.
5. Supabase schema and setup instructions are ready for manual deployment.
6. Household store persists non-auth state across app restarts.

**Plan:** `.planning/phases/01-foundation/PLAN.md`

**Plan Needed Before Code:** Complete

## Phase 2: Auth and Household

**Goal:** Implement email auth, role selection, household creation, invite-code joining, session persistence, and two-user limit enforcement.

**Requirements:** AUTH-01 through AUTH-06

**Success Criteria**

1. First user can create household as mother or partner.
2. Second user can join by invite code.
3. Household is limited to two users.
4. Session survives app restart.
5. Auth state routes users correctly.

## Phase 3: Home and Shared Todos

**Goal:** Deliver the main shared household dashboard with stage/week status, progress, recent health summary, realtime todos, and quick actions.

**Requirements:** HOME-01 through HOME-05, TRAK-02

**Success Criteria**

1. Home status reflects confirmed due date/stage.
2. Top todos load, complete, and sync between users.
3. Recent health summary renders empty and populated states.
4. Quick actions route correctly.

## Phase 4: Health Logging and Journal

**Goal:** Let both users capture symptoms, mood, energy, notes, and shared journal entries.

**Requirements:** TRAK-01, SCRN-01, SCRN-02

**Success Criteria**

1. Symptom log saves to Supabase and appears in history.
2. Journal entries save and group by week or stage.
3. Both users see new records without manual refresh where realtime is enabled.

## Phase 5: Pregnancy Tracking Tools

**Goal:** Implement kick counter and offline contraction timer with later sync.

**Requirements:** TRAK-03 through TRAK-05

**Success Criteria**

1. Kick sessions save with count, timing, and notes.
2. Contraction timer works with network disabled.
3. Timer state survives app background/restart.
4. Completed sessions sync when connectivity returns.

## Phase 6: Partner and Appointments

**Goal:** Complete partner support surface and household appointment management.

**Requirements:** SCRN-03, APPT-01, APPT-02

**Success Criteria**

1. Partner screen gives useful current support context.
2. Appointments can be created and viewed by both users.
3. Upcoming appointments are visible where users naturally need them.

## Phase 7: Integration Decision and Add-ons

**Goal:** Decide and implement only the integrations that remain worth the added complexity after the core private app works.

**Candidates:** INTG-01 through INTG-04, POST-01

**Success Criteria**

1. Google Calendar, push notifications, AI content, and postpartum trackers are each accepted, deferred, or rejected based on actual usage.
2. Any accepted integration has credentials, privacy implications, and rollback behavior documented before code.

## Immediate Next Step

Run GSD Phase 1 planning in this repo. The Phase 1 plan should be generated fresh and should not execute old Claude plan files verbatim.
