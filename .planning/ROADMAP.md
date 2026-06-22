# Roadmap: Blueberry

**Milestone:** v1 private household companion  
**Created:** 2026-05-15  
**Workflow:** GSD, clean Codex-owned repo

## Execution Milestone Rebaseline (2026-06-21)

This is the active delivery schedule used for current build execution.

1. Non-AI Phase 1 completion target: Friday 2026-06-26.
2. AI scope is fully deferred to Phase 2 start: Monday 2026-06-29.

### Dated Milestones

- Phase 0: 2026-06-22 to 2026-06-23 (scope lock and acceptance criteria)
- Phase 1: 2026-06-24 to 2026-06-26 (non-AI product readiness sprint)
- Phase 2: 2026-06-29 to 2026-07-24 (AI alpha and controlled beta)
- Phase 3: 2026-07-27 to 2026-08-21 (AI commercial readiness)
- Phase 4: starts 2026-08-24 (differentiation expansion)

### How To Read This Roadmap

1. The dated milestones above are the authoritative delivery timeline.
2. The numbered phase sections below are a capability index (what the product includes), not a strict calendar sequence.
3. If there is any conflict, follow the dated milestones and this rebaseline block.

### Delivery-To-Capability Mapping

- Delivery Phase 0 to 1 (non-AI) focuses on readiness and stabilization across existing capability phases, especially partner experience, tracker quality, household sync, appointments, and notifications.
- Delivery Phase 2 starts AI implementation (capability Phase 7d).
- Delivery Phase 3 prepares AI commercialization and rollout controls.
- Delivery Phase 4 continues differentiation expansion (including partner intelligence and postpartum maturity).

### Phase 1 (Non-AI) Build Scope Lock

- Partner-first UX completion on primary household surfaces.
- Pregnancy-core tracker quality and reliability pass.
- Household stability pass (invite, join, sync, and error handling).
- Notifications and reminder hardening for current non-AI features.
- Performance and polish pass on daily-use screens.
- App Store positioning artifacts centered on partner-first value.

### Phase 2 (AI) Start Criteria

- Phase 1 exits with no unresolved P0/P1 defects in locked scope.
- Core non-AI flows pass UAT checklist.
- Controlled rollout candidate is ready.

## Capability Phase Index (Legacy Numbering)

## Phase 0: Clean Planning

**Goal:** Establish a clean Codex plan from useful legacy context without importing legacy implementation artifacts.

**Status:** Complete

**Success Criteria**

1. Old planning files inspected.
2. Preserve/discard/reconfirm decisions documented.
3. New `.planning/` files created in this repo.

## Phase 1: Foundation

**Goal:** Create a running Expo TypeScript app with navigation skeleton, design tokens, shared UI primitives, Supabase schema/setup docs, typed domain model, and local household store.

**Status:** In progress

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

## Phase 7a: Google Calendar Sync (promoted to Phase 1, 2026-05-23)

**Re-baselined 2026-06-21:** Core implementation is complete in code (OAuth PKCE, token lifecycle, conflict-policy handling, and two-way sync paths). Remaining gate is real-device verification against live accounts and appointments.

**Goal:** Two-way sync of `appointments` with the user's Google Calendar.

**Success Criteria**

1. User can connect Google Calendar via OAuth from the More tab.
2. New appointments created in-app appear on Google Calendar.
3. Updates and deletes propagate both directions.
4. Both partners can see all appointments regardless of which one created them.
5. `appointments.google_event_id` stores the bound event reference.

## Phase 7b: Apple Calendar (EventKit) Sync (promoted to Phase 1, 2026-05-23)

**Goal:** Two-way sync of `appointments` with iOS EventKit.

**Success Criteria**

1. iOS permission flow requested at the first appointment screen, not at launch.
2. New appointments created in-app appear in the user's chosen calendar.
3. EventKit changes flow back into Supabase on sync.
4. Schema carries the EventKit identifier (add `apple_event_id` column when planning).

## Phase 7c: Push Notifications (promoted to Phase 1, 2026-05-23)

**Re-baselined 2026-06-20:** Execute APNs-first iOS delivery in this phase; Android/FCM remains required future intent and moves to a follow-on phase after APNs verification closes.

**Goal:** Push notifications for shared household events: appointment reminders, partner's check-in shared, todo assigned, kick session reminder.

**Success Criteria**

1. Push tokens registered and stored against the user row.
2. Notification copy follows the locked voice rules (no exclamation points, no "Hey Mama!" energy).
3. Payloads carry no raw health-log content. Only shared signals such as a chip, a sentence Mom chose to share, or an appointment title.
4. User can adjust which categories ping them from More, Notifications.
5. Quiet hours (default 9 pm to 7 am) honored across all categories except labor-stage emergencies.

**Status:** In progress. The real repo now has APNs token registration, a notifications preferences modal, local appointment reminder scheduling on-device, and a direct APNs Edge Function scaffold. Remaining work is backend deployment, orchestration, and physical-device verification.

## Phase 7d: AI Content (Phase 2 scope)

**Goal:** Stage-aware AI content for Mom's week detail, Partner's support suggestions, and the conversation prompt.

**Status:** Deferred to Phase 2 starting 2026-06-29. The `todos.source = 'ai'` enum and the UI surfaces are scaffolded; the producer is not.

## Phase 8: Family Mode (Postpartum)

**Re-baselined 2026-06-21:** Keep postpartum scope intact. The explicit trigger path (More -> Begin Family Mode) is implemented; remaining execution is postpartum variants and shared support surfaces.

**Goal:** When `households.baby_dob` is set, the app transitions into Family Mode. Feeding, sleep, diaper logs; pediatric visits; baby milestones; postpartum check-in for Mom; honest night-shift swap for Partner.

**Status:** In progress. Trigger and consolidated baby tracker flow are implemented in app code; postpartum variants for Home/Health/Together plus dedicated shared night-shift surfaces remain open.

**Trigger:** Test household's real due date is 2025-10-11; they are already postpartum. Family Mode planning should not lag behind Phase 1 verification by more than one phase.

## Immediate Next Step

Execute the dated Phase 0 and Phase 1 plan to close non-AI readiness by 2026-06-26, then begin AI build in Phase 2 on 2026-06-29.
