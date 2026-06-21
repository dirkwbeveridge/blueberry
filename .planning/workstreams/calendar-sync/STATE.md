---
workstream: calendar-sync
created: 2026-06-09
updated: 2026-06-20
---

# Project State

## Current Position
**Status:** In progress
**Current Phase:** 01-calendar-sync
**Last Activity:** 2026-06-20
**Last Activity Description:** 7a Google Calendar implementation completed in code (OAuth PKCE, token lifecycle, write-path sync, foreground sync, conflict-policy handling). 7b remains not started.

## Progress
**Phases Complete:** 0
**Current Plan:** `.planning/workstreams/calendar-sync/phases/01-calendar-sync/PLAN.md`

## Sub-Phases

| Sub-phase | Description | Status |
|---|---|---|
| 7a | Google Calendar two-way sync via OAuth PKCE + REST API | Code complete, verification pending |
| 7b | Apple Calendar (EventKit) two-way sync via expo-calendar | Not started |

## Dependency

This workstream requires the **core-app workstream Phase 6 (Partner and Appointments)** to be live and end-to-end verified before calendar sync can be tested. Specifically:

- `appointments` table must be deployed in Supabase with RLS active.
- The Add Appointment modal (`app/(modals)/add-appointment.tsx`) must be confirmed saving records to Supabase.
- Both partners must be able to view shared appointments.

Tasks 7 and 10 are now implemented in code. Remaining execution for this workstream is 7a real-device verification and 7b implementation.

## Blocking Open Questions

Before execution can begin, the following require a human decision:

- ~~**OQ-1:**~~ ✅ Resolved in implementation: OAuth uses native PKCE client flow.
- ~~**OQ-2:**~~ ✅ Resolved 2026-06-09 — Google Cloud Console project created and Calendar API configured.
- ~~**OQ-3:**~~ ✅ Resolved in implementation: runtime user-selectable policy (`google_wins` / `blueberry_wins`).
- ~~**OQ-4:**~~ ✅ Resolved in implementation: dedicated `edit-appointment.tsx` modal path.

## Task Status Matrix (Plan 01-calendar-sync)

- Task 1 (7b schema/types): not done
- Task 2 (Google token store): done
- Task 3 (Google connect screen): done
- Task 4 (More tab wiring): partial (Google done, Apple pending)
- Task 5 (Google API wrapper): done
- Task 6 (Apple/EventKit helpers): not done
- Task 7 (save -> Google sync): done
- Task 8 (save -> Apple sync): not done
- Task 9 (update/delete sync): partial (Google done, Apple pending)
- Task 10 (inbound Google sync): done
- Task 11 (inbound Apple sync): not done

## Session Continuity
**Stopped At:** 7a code-complete state with verification pending; 7b not started.
**Resume File:** .planning/workstreams/calendar-sync/phases/01-calendar-sync/PLAN.md

## Next Action

1. Real-device verify 7a behavior (connect, sync, conflict-policy outcomes).
2. Start 7b with schema/type prerequisites (`apple_event_id` + migration), then EventKit helpers.
