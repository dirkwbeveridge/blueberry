---
workstream: calendar-sync
created: 2026-06-09
updated: 2026-06-09
---

# Project State

## Current Position
**Status:** Planned
**Current Phase:** 01-calendar-sync
**Last Activity:** 2026-06-09
**Last Activity Description:** Phase plan written covering sub-phases 7a (Google Calendar) and 7b (Apple Calendar / EventKit)

## Progress
**Phases Complete:** 0
**Current Plan:** `.planning/workstreams/calendar-sync/phases/01-calendar-sync/PLAN.md`

## Sub-Phases

| Sub-phase | Description | Status |
|---|---|---|
| 7a | Google Calendar two-way sync via OAuth PKCE + REST API | Planned |
| 7b | Apple Calendar (EventKit) two-way sync via expo-calendar | Planned |

## Dependency

This workstream requires the **core-app workstream Phase 6 (Partner and Appointments)** to be live and end-to-end verified before calendar sync can be tested. Specifically:

- `appointments` table must be deployed in Supabase with RLS active.
- The Add Appointment modal (`app/(modals)/add-appointment.tsx`) must be confirmed saving records to Supabase.
- Both partners must be able to view shared appointments.

Do not execute Tasks 7–11 of the calendar-sync plan until these are confirmed.

## Blocking Open Questions

Before execution can begin, the following require a human decision:

- **OQ-1:** Google OAuth client secret handling strategy (Supabase Edge Function proxy vs. native iOS public client vs. bundled — see PLAN.md).
- ~~**OQ-2:**~~ ✅ **Resolved 2026-06-09** — Google Cloud Console project created and confirmed. OAuth client and Calendar API are set up.
- **OQ-3:** Conflict resolution rule when the same appointment is modified in both Blueberry and Google Calendar before a sync run.
- **OQ-4:** Whether `edit-appointment.tsx` should be a new modal or a param-driven mode of the existing `add-appointment.tsx`.

## Session Continuity
**Stopped At:** N/A — not yet in execution
**Resume File:** None
