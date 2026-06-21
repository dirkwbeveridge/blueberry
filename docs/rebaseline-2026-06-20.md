# Blueberry Re-Baseline (2026-06-20)

## Purpose
Formal re-baseline for agreed drift findings across planning/state docs, with explicit execution gates for current and upcoming phases.

## Scope Deltas
- INTG-02 execution is re-baselined to APNs-first iOS delivery in this phase.
- Android/FCM push delivery remains intended scope, deferred to a follow-on phase.
- Phase 7a is reinterpreted from "planned" to "foundation started" based on existing connect surfaces.
- Phase 4 status reflects current nav reality: journal route is in active tab set.
- Phase 8 trigger path is explicitly maintained as More -> Begin Family Mode, with implementation still pending.

## Decisions Taken
1. Keep full push scope intent, but execute APNs-first now and defer FCM without removing future requirement.
2. Treat Google Calendar work as partially started only at UI/connect layer.
3. Gate 7a completion on OAuth token exchange plus two-way event sync.
4. Gate 8 start on explicit trigger implementation in More.
5. Keep due-date policy aligned to user-entered values; avoid any seeded due-date behavior.

## Accepted Technical Debt
- Google Calendar connect UX exists without backend OAuth exchange/sync engine.
- EventKit sync remains planned-only with schema intent and no execution.
- APNs backend deployment and secret management remain externally gated.
- Family Mode trigger is documented but not yet wired in UI flow.

## Exit Criteria by Phase

### Phase 1 (Foundation)
- Golden path verified on physical device against deployed Supabase (auth, household create/join, realtime updates).
- Notification settings modal and APNs token refresh validated in live environment.

### Phase 7a (Google Calendar)
- OAuth PKCE exchange implemented end-to-end.
- Appointment create/update/delete synchronize both directions.
- Bound event IDs persist reliably in appointment records.

### Phase 7b (Apple Calendar/EventKit)
- EventKit permission prompt occurs contextually (not at app launch).
- Two-way appointment sync verified on iOS device.
- Apple event IDs persist and update safely.

### Phase 7c (Push Notifications)
- APNs Edge Function deployed with valid secrets.
- Real-device APNs token registration and delivery verified.
- Quiet hours and category toggles enforce expected behavior.

### Phase 8 (Family Mode)
- More -> Begin Family Mode trigger implemented.
- Triggered flow transitions correctly into postpartum experience.
- Initial postpartum modules are accessible behind trigger path.

## Remediated Drift Checklist (12)
1. INTG-02 wording updated to APNs-first execution for this phase.
2. INTG-02 future Android/FCM intent explicitly preserved.
3. POST-01 trigger text normalized to explicit More -> Begin Family Mode wording.
4. Phase 4 status corrected to reflect journal in active tab set.
5. Phase 7a status corrected from "not started" to "foundation started".
6. Phase 7a gate made explicit: OAuth exchange + two-way sync implementation.
7. Phase 8 status clarified to trigger-defined but implementation-not-started.
8. Blockers updated with concrete 7a/7b implementation gates.
9. Blockers updated with concrete Family Mode trigger implementation gate.
10. Due-date blocker language aligned with user-entered due-date policy.
11. Roadmap phase 7a includes re-baselined interpretation note dated 2026-06-20.
12. Roadmap phases 7c and 8 include dated re-baseline execution notes.
