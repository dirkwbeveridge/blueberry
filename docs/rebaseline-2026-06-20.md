# Blueberry Re-Baseline (2026-06-20)

## Purpose

Formal re-baseline for agreed drift findings across planning/state docs, with explicit execution gates for current and upcoming phases.

## Scope Deltas

- INTG-02 execution is re-baselined to APNs-first iOS delivery in this phase.
- Android/FCM push delivery remains intended scope, deferred to a follow-on phase.
- Phase 7a is now code-complete in app (OAuth/token/sync/conflict policy) with real-device verification still pending.
- Phase 4 status reflects current nav reality: journal route is in active tab set.
- Phase 8 trigger path remains More -> Begin Family Mode, and that trigger implementation is now in place.

## Decisions Taken

1. Keep full push scope intent, but execute APNs-first now and defer FCM without removing future requirement.
2. Treat Google Calendar work as implementation-complete in code and gate completion on real-device/live-account verification.
3. Gate 7a closure on verified connect flow and two-way sync behavior on device.
4. Gate 8 continuation on postpartum surface completion after trigger implementation in More.
5. Keep due-date policy aligned to user-entered values; avoid any seeded due-date behavior.

## Accepted Technical Debt

- Google Calendar code path is implemented; evidence is still manual verification and not an automated integration suite.
- EventKit sync remains planned-only with schema intent and no execution.
- APNs backend deployment and secret management remain externally gated.
- Family Mode trigger is wired; postpartum variants and support surfaces remain incomplete.

## Exit Criteria by Phase

### Phase 1 (Foundation)

- Golden path verified on physical device against deployed Supabase (auth, household create/join, realtime updates).
- Notification settings modal and APNs token refresh validated in live environment.

### Phase 7a (Google Calendar)

- Real-device connect flow verified against live Google account.
- Appointment create/update/delete synchronization behavior verified in both directions.
- Conflict-policy outcomes (`google_wins`, `blueberry_wins`) verified in manual device tests.

### Phase 7b (Apple Calendar/EventKit)

- EventKit permission prompt occurs contextually (not at app launch).
- Two-way appointment sync verified on iOS device.
- Apple event IDs persist and update safely.

### Phase 7c (Push Notifications)

- APNs Edge Function deployed with valid secrets.
- Real-device APNs token registration and delivery verified.
- Quiet hours and category toggles enforce expected behavior.

### Phase 8 (Family Mode)

- Trigger remains implemented and verified reachable from More.
- Postpartum variants for Home/Health/Together implemented for daily usability.
- Shared postpartum support surfaces (including night-shift workflow) implemented.

## Remediated Drift Checklist (12)

1. INTG-02 wording updated to APNs-first execution for this phase.
2. INTG-02 future Android/FCM intent explicitly preserved.
3. POST-01 trigger text normalized to explicit More -> Begin Family Mode wording.
4. Phase 4 status corrected to reflect journal in active tab set.
5. Phase 7a status corrected from "foundation started" to "code complete, verification pending".
6. Phase 7a gate made explicit: real-device verification of sync and conflict-policy behavior.
7. Phase 8 status clarified to trigger-implemented with postpartum surface work pending.
8. Blockers updated with concrete 7a/7b implementation gates.
9. Blockers updated with concrete Family Mode trigger implementation gate.
10. Due-date blocker language aligned with user-entered due-date policy.
11. Roadmap phase 7a includes re-baselined interpretation note dated 2026-06-20.
12. Roadmap phases 7c and 8 include dated re-baseline execution notes.
